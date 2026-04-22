/**
 * migrationRunner.js
 * Motor principal de migraciones — descubre, ordena y ejecuta archivos
 * de migración distribuidos por módulo.
 *
 * Flujo:
 *   1. Leer moduleOrder.js para obtener el orden de módulos
 *   2. Por cada módulo, glob database/migrations/*.js
 *   3. Ordenar lexicográficamente dentro de cada módulo
 *   4. Filtrar las ya aplicadas (consultando dsg_bss_migration_meta)
 *   5. Ejecutar las pendientes en transacciones individuales
 *
 * Reglas:
 *   - Nunca importar modelos de la app dentro de migraciones
 *   - Cada migración se ejecuta en su propia transacción
 *   - Si una migración falla, las siguientes NO se ejecutan
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sequelize = require('../src/config/db');
const { MigrationMeta } = require('./MigrationMeta');
const { MODULE_ORDER } = require('./moduleOrder');

// Ruta base a los módulos ─────────────────────────────────────────────────────
const MODULES_DIR = path.join(__dirname, '..', 'src', 'modules');

// ─── Funciones auxiliares ────────────────────────────────────────────────────

/**
 * Calcula SHA-256 del contenido de un archivo
 * @param {string} filePath - Ruta absoluta al archivo
 * @returns {string} Hash SHA-256 en hexadecimal
 */
function computeChecksum(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Formatea milisegundos en formato legible (ej: "1.2s", "345ms")
 * @param {number} ms - Milisegundos
 * @returns {string} Tiempo formateado
 */
function formatTime(ms) {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// ─── Descubrimiento de migraciones ──────────────────────────────────────────

/**
 * Descubre todas las migraciones disponibles, ordenadas por módulo y nombre.
 * @returns {Array<{name: string, module: string, filePath: string}>}
 */
async function discoverMigrations() {
    const migrations = [];

    for (const moduleName of MODULE_ORDER) {
        const migrationsDir = path.join(MODULES_DIR, moduleName, 'database', 'migrations');

        // Si el módulo no tiene directorio de migraciones, saltar ─────────────
        if (!fs.existsSync(migrationsDir)) continue;

        // Buscar archivos .js ordenados lexicográficamente ────────────────────
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.js'))
            .sort();

        for (const file of files) {
            migrations.push({
                name: file,
                module: moduleName,
                filePath: path.join(migrationsDir, file)
            });
        }
    }

    return migrations;
}

// ─── Ejecución de migraciones pendientes ────────────────────────────────────

/**
 * Ejecuta todas las migraciones pendientes en orden.
 * Cada migración corre dentro de su propia transacción PostgreSQL.
 *
 * @returns {{ pending: number, applied: number, failed: string|null }}
 */
async function runPendingMigrations() {
    // Garantizar que la tabla de tracking exista ──────────────────────────────
    await MigrationMeta.sync({ force: false });

    // Obtener migraciones ya aplicadas ────────────────────────────────────────
    const appliedRows = await MigrationMeta.findAll({
        where: { status: 'applied' },
        attributes: ['migration_name']
    });
    const appliedSet = new Set(appliedRows.map(r => r.migration_name));

    // Descubrir todas las migraciones disponibles ─────────────────────────────
    const allMigrations = await discoverMigrations();

    // Filtrar las pendientes ──────────────────────────────────────────────────
    const pending = allMigrations.filter(m => !appliedSet.has(m.name));

    if (pending.length === 0) {
        console.log('  ✅ No hay migraciones pendientes');
        return { pending: 0, applied: 0, failed: null };
    }

    // Calcular siguiente batch ────────────────────────────────────────────────
    const maxBatchResult = await MigrationMeta.max('batch');
    const nextBatch = (maxBatchResult || 0) + 1;

    console.log(`\n📦 Batch #${nextBatch} — ${pending.length} migración(es) pendiente(s)\n`);

    // Ejecutar cada migración en su propia transacción ────────────────────────
    let appliedCount = 0;
    const queryInterface = sequelize.getQueryInterface();

    for (const migration of pending) {
        const transaction = await sequelize.transaction();
        const startTime = Date.now();

        try {
            // Cargar el archivo de migración ─────────────────────────────────
            const migrationFile = require(migration.filePath);

            // Calcular checksum ──────────────────────────────────────────────
            const checksum = computeChecksum(migration.filePath);

            // Ejecutar up() ──────────────────────────────────────────────────
            console.log(`  ⏳ [${migration.module}] ${migration.name}...`);
            await migrationFile.up(queryInterface, sequelize, transaction);

            const executionTime = Date.now() - startTime;

            // Registrar en la tabla de tracking ──────────────────────────────
            await MigrationMeta.create({
                migration_name: migration.name,
                module: migration.module,
                batch: nextBatch,
                checksum,
                executed_at: new Date(),
                status: 'applied',
                execution_time_ms: executionTime
            }, { transaction });

            await transaction.commit();
            appliedCount++;
            console.log(`  ✅ [${migration.module}] ${migration.name} (${formatTime(executionTime)})`);

        } catch (error) {
            await transaction.rollback();
            console.error(`\n  ❌ [${migration.module}] ${migration.name} — FALLÓ`);
            console.error(`     Error: ${error.message}\n`);
            return { pending: pending.length, applied: appliedCount, failed: migration.name };
        }
    }

    console.log(`\n✅ Batch #${nextBatch} completo — ${appliedCount} migración(es) aplicada(s)\n`);
    return { pending: pending.length, applied: appliedCount, failed: null };
}

// ─── Estado de migraciones ──────────────────────────────────────────────────

/**
 * Muestra el estado de todas las migraciones descubiertas.
 * Indica cuáles están aplicadas, pendientes o tienen checksum modificado.
 */
async function getMigrationStatus() {
    // Garantizar que la tabla de tracking exista ──────────────────────────────
    await MigrationMeta.sync({ force: false });

    // Obtener migraciones aplicadas con su checksum ──────────────────────────
    const appliedRows = await MigrationMeta.findAll({
        where: { status: 'applied' },
        order: [['batch', 'ASC'], ['id', 'ASC']]
    });
    const appliedMap = new Map(appliedRows.map(r => [r.migration_name, r]));

    // Descubrir todas las migraciones ─────────────────────────────────────────
    const allMigrations = await discoverMigrations();

    if (allMigrations.length === 0) {
        console.log('  No se encontraron archivos de migración.');
        return { total: 0, applied: 0, pending: 0, modified: 0 };
    }

    // Mostrar estado ─────────────────────────────────────────────────────────
    let pendingCount = 0;
    let modifiedCount = 0;
    let currentModule = '';

    console.log('\n📋 Estado de migraciones:\n');

    for (const migration of allMigrations) {
        // Encabezado por módulo ───────────────────────────────────────────────
        if (migration.module !== currentModule) {
            currentModule = migration.module;
            console.log(`  ── ${currentModule} ${'─'.repeat(50 - currentModule.length)}`);
        }

        const applied = appliedMap.get(migration.name);

        if (applied) {
            // Verificar checksum ─────────────────────────────────────────────
            const currentChecksum = computeChecksum(migration.filePath);
            const modified = currentChecksum !== applied.checksum;

            if (modified) {
                modifiedCount++;
                console.log(`  ⚠️  ${migration.name}  [Batch #${applied.batch}] — MODIFICADO después de aplicar`);
            } else {
                const date = new Date(applied.executed_at).toISOString().split('T')[0];
                console.log(`  ✅ ${migration.name}  [Batch #${applied.batch}, ${date}]`);
            }
        } else {
            pendingCount++;
            console.log(`  ⏳ ${migration.name}  — PENDIENTE`);
        }
    }

    // Resumen ─────────────────────────────────────────────────────────────────
    const appliedCount = appliedMap.size;
    console.log(`\n  Total: ${allMigrations.length} | Aplicadas: ${appliedCount} | Pendientes: ${pendingCount} | Modificadas: ${modifiedCount}\n`);

    return { total: allMigrations.length, applied: appliedCount, pending: pendingCount, modified: modifiedCount };
}

// ─── Rollback ───────────────────────────────────────────────────────────────

/**
 * Revierte las migraciones del último batch (o de un batch específico).
 * Ejecuta down() en orden inverso y marca las migraciones como 'rolled_back'.
 *
 * @param {number|null} batchNumber - Batch a revertir (null = último)
 * @returns {{ rolledBack: number }}
 */
async function rollbackBatch(batchNumber = null) {
    await MigrationMeta.sync({ force: false });

    // Determinar qué batch revertir ──────────────────────────────────────────
    let targetBatch = batchNumber;
    if (!targetBatch) {
        targetBatch = await MigrationMeta.max('batch', { where: { status: 'applied' } });
    }

    if (!targetBatch) {
        console.log('  No hay migraciones para revertir.');
        return { rolledBack: 0 };
    }

    // Obtener migraciones del batch en orden inverso ─────────────────────────
    const batchMigrations = await MigrationMeta.findAll({
        where: { batch: targetBatch, status: 'applied' },
        order: [['id', 'DESC']]
    });

    if (batchMigrations.length === 0) {
        console.log(`  No hay migraciones aplicadas en el batch #${targetBatch}.`);
        return { rolledBack: 0 };
    }

    console.log(`\n🔄 Revirtiendo batch #${targetBatch} — ${batchMigrations.length} migración(es)\n`);

    const queryInterface = sequelize.getQueryInterface();
    let rolledBackCount = 0;

    for (const record of batchMigrations) {
        // Buscar el archivo de migración correspondiente ─────────────────────
        const allMigrations = await discoverMigrations();
        const migration = allMigrations.find(m => m.name === record.migration_name);

        if (!migration) {
            console.error(`  ❌ Archivo no encontrado: ${record.migration_name} — no se puede revertir`);
            continue;
        }

        const transaction = await sequelize.transaction();

        try {
            const migrationFile = require(migration.filePath);

            if (typeof migrationFile.down !== 'function') {
                console.warn(`  ⚠️  [${record.module}] ${record.migration_name} — sin función down(), saltando`);
                await transaction.rollback();
                continue;
            }

            console.log(`  ⏳ Revirtiendo [${record.module}] ${record.migration_name}...`);
            await migrationFile.down(queryInterface, sequelize, transaction);

            // Actualizar estado en la tabla de tracking ───────────────────────
            await record.update({
                status: 'rolled_back',
                rolled_back_at: new Date()
            }, { transaction });

            await transaction.commit();
            rolledBackCount++;
            console.log(`  ✅ Revertido [${record.module}] ${record.migration_name}`);

        } catch (error) {
            await transaction.rollback();
            console.error(`  ❌ [${record.module}] ${record.migration_name} — rollback FALLÓ`);
            console.error(`     Error: ${error.message}`);
            break;
        }
    }

    console.log(`\n✅ Rollback completo — ${rolledBackCount} migración(es) revertida(s)\n`);
    return { rolledBack: rolledBackCount };
}

module.exports = {
    discoverMigrations,
    runPendingMigrations,
    getMigrationStatus,
    rollbackBatch
};
