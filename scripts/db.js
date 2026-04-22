#!/usr/bin/env node

/**
 * scripts/db.js
 * CLI para gestión de base de datos — migraciones, seeders y utilidades.
 *
 * Uso:
 *   node scripts/db.js migrate              — Ejecuta migraciones pendientes
 *   node scripts/db.js migrate:status       — Muestra estado de migraciones
 *   node scripts/db.js migrate:rollback     — Revierte el último batch
 *   node scripts/db.js migrate:create       — Genera archivo de migración
 *   node scripts/db.js seed                 — Ejecuta seeders pendientes
 *   node scripts/db.js seed:status          — Muestra estado de seeders
 *   node scripts/db.js db:setup             — migrate + seed en secuencia
 *   node scripts/db.js db:create            — Crea la BD si no existe, luego migrate + seed
 *   node scripts/db.js db:reset             — Elimina TODO, re-migra y re-siembra (solo desarrollo)
 *
 * Opciones:
 *   --module=<nombre>    Módulo destino (para migrate:create)
 *   --name=<descripcion> Nombre descriptivo (para migrate:create)
 *   --batch=<numero>     Batch específico (para migrate:rollback)
 *   --force              Saltar confirmación de db:reset
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ─── Rutas base ─────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// ─── Parseo de argumentos ───────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];

/**
 * Extrae el valor de un flag --key=value de los argumentos
 * @param {string} key - Nombre del flag (sin --)
 * @returns {string|null}
 */
function getFlag(key) {
    const arg = args.find(a => a.startsWith(`--${key}=`));
    return arg ? arg.split('=')[1] : null;
}

// Verifica si un flag booleano está presente (--force) ───────────────────────
function hasFlag(key) {
    return args.includes(`--${key}`);
}

// ─── Confirmación interactiva ───────────────────────────────────────────────

/**
 * Solicita confirmación al usuario vía stdin.
 * @param {string} message - Pregunta a mostrar
 * @returns {Promise<boolean>}
 */
function confirm(message) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(`${message} (y/N): `, answer => {
            rl.close();
            resolve(answer.trim().toLowerCase() === 'y');
        });
    });
}

// ─── Comando: migrate:create ────────────────────────────────────────────────

/**
 * Genera un archivo de migración con boilerplate en el módulo indicado.
 * Uso: npm run migrate:create <modulo> <nombre>
 * Nombrado automático: YYYYMMDD_NNN_<nombre>.js
 */
async function createMigration() {
    // Argumentos posicionales: migrate:create <modulo> <nombre> ───────────────
    const moduleName = args[1];
    const migrationName = args[2];
    const { MODULE_ORDER } = require('./moduleOrder');

    if (!moduleName || !migrationName) {
        console.error('❌ Uso: npm run migrate:create <modulo> <nombre>');
        console.error(`   Módulos registrados: ${MODULE_ORDER.join(', ')}`);
        console.error('   Ejemplo: npm run migrate:create booking add_recurring_fields');
        process.exit(1);
    }

    // Validar que el módulo esté registrado en moduleOrder.js ─────────────────
    if (!MODULE_ORDER.includes(moduleName)) {
        console.error(`❌ Módulo '${moduleName}' no está registrado en scripts/moduleOrder.js`);
        console.error(`   Módulos disponibles: ${MODULE_ORDER.join(', ')}`);
        console.error('   Si es un módulo nuevo, agrégalo primero a MODULE_ORDER en scripts/moduleOrder.js');
        process.exit(1);
    }

    // Verificar que el directorio del módulo existe ──────────────────────────
    const modulesDir = path.join(SRC_DIR, 'modules');
    const moduleDir = path.join(modulesDir, moduleName);

    if (!fs.existsSync(moduleDir)) {
        console.error(`❌ Directorio del módulo no encontrado: src/modules/${moduleName}/`);
        process.exit(1);
    }

    // Crear directorio de migraciones si no existe ────────────────────────────
    const migrationsDir = path.join(moduleDir, 'database', 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });

    // Generar nombre con timestamp ────────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const existingFiles = fs.existsSync(migrationsDir)
        ? fs.readdirSync(migrationsDir).filter(f => f.startsWith(today))
        : [];
    const nextNumber = String(existingFiles.length + 1).padStart(3, '0');
    const fileName = `${today}_${nextNumber}_${migrationName}.js`;

    // Escribir el boilerplate ─────────────────────────────────────────────────
    const template = `/**
 * Migración: ${migrationName}
 * Módulo: ${moduleName}
 * Creada: ${new Date().toISOString()}
 */

const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: '${migrationName.replace(/_/g, ' ')}',
        module: '${moduleName}'
    },

    /**
     * Aplicar migración
     * @param {import('sequelize').QueryInterface} queryInterface
     * @param {import('sequelize').Sequelize} sequelize
     * @param {import('sequelize').Transaction} transaction
     */
    async up(queryInterface, sequelize, transaction) {
        // TODO: implementar migración
    },

    /**
     * Revertir migración
     * @param {import('sequelize').QueryInterface} queryInterface
     * @param {import('sequelize').Sequelize} sequelize
     * @param {import('sequelize').Transaction} transaction
     */
    async down(queryInterface, sequelize, transaction) {
        // TODO: implementar rollback
    }
};
`;

    const filePath = path.join(migrationsDir, fileName);
    fs.writeFileSync(filePath, template, 'utf8');

    const relativePath = path.relative(ROOT_DIR, filePath);
    console.log(`\n✅ Migración creada: ${relativePath}\n`);
}

// ─── Helpers: conexión a postgres para crear BD ─────────────────────────────

/**
 * Crea la base de datos si no existe, conectándose primero a 'postgres' (BD por defecto).
 * Retorna true si la creó, false si ya existía.
 */
async function ensureDatabaseExists() {
    const { Client } = require('pg');
    const dbName = process.env.DB_NAME || 'db_sport';

    // Conectar a la BD por defecto de Postgres, no a la BD objetivo ────────────
    const client = new Client({
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres',
    });

    await client.connect();

    try {
        // Verificar si ya existe ──────────────────────────────────────────────
        const res = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (res.rowCount === 0) {
            // CREATE DATABASE no admite prepared statements, usar identifiers seguros
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Base de datos '${dbName}' creada.`);
            return true;
        }

        console.log(`ℹ️  Base de datos '${dbName}' ya existe.`);
        return false;
    } finally {
        await client.end();
    }
}

// ─── Comando: db:create ─────────────────────────────────────────────────────

/**
 * Crea la base de datos si no existe y ejecuta migrate + seed desde cero.
 * Equivale a un onboarding completo para un entorno nuevo.
 */
async function dbCreate() {
    try {
        console.log('\n🗄️  Verificando base de datos...\n');
        await ensureDatabaseExists();
    } catch (error) {
        console.error('❌ No se pudo crear la base de datos:', error.message);
        process.exit(1);
    }

    // Con la BD garantizada, ejecutar setup completo ───────────────────────────
    await dbSetup();
}

// ─── Comando: db:reset ─────────────────────────────────────────────────────

/**
 * Elimina todas las tablas de la base de datos, re-ejecuta migraciones
 * y re-siembra los datos. SOLO para desarrollo — bloqueado en producción.
 */
async function dbReset() {
    // Bloquear en producción ──────────────────────────────────────────────────
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ db:reset está BLOQUEADO en producción.');
        console.error('   Este comando elimina TODOS los datos de la base de datos.');
        process.exit(1);
    }

    // Confirmación interactiva (saltable con --force) ─────────────────────────
    if (!hasFlag('force')) {
        console.log('\n⚠️  ADVERTENCIA: Este comando va a:');
        console.log('   1. Crear la base de datos si no existe');
        console.log('   2. Eliminar TODAS las tablas existentes');
        console.log('   3. Re-ejecutar TODAS las migraciones');
        console.log('   4. Re-ejecutar TODOS los seeders\n');
        console.log(`   Base de datos: ${process.env.DB_NAME || 'desconocida'}`);
        console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}\n`);

        const confirmed = await confirm('¿Estás seguro?');
        if (!confirmed) {
            console.log('   Cancelado.');
            process.exit(0);
        }
    }

    // Garantizar que la BD existe antes de intentar limpiarla ─────────────────
    try {
        console.log('\n🗄️  Verificando base de datos...\n');
        await ensureDatabaseExists();
    } catch (error) {
        console.error('❌ No se pudo crear la base de datos:', error.message);
        process.exit(1);
    }

    const sequelize = require('../src/config/db');

    try {
        console.log('\n🗑️  Eliminando todas las tablas...\n');

        // Desactivar restricciones FK para poder eliminar en cualquier orden ──
        await sequelize.query('SET session_replication_role = replica;');

        // Obtener todas las tablas del schema public ─────────────────────────
        const [tables] = await sequelize.query(
            `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
        );

        if (tables.length === 0) {
            console.log('   No hay tablas para eliminar.');
        } else {
            // Eliminar cada tabla ─────────────────────────────────────────────
            for (const { tablename } of tables) {
                await sequelize.query(`DROP TABLE IF EXISTS "public"."${tablename}" CASCADE`);
                console.log(`   🗑️  Eliminada: ${tablename}`);
            }
            console.log(`\n   ✅ ${tables.length} tabla(s) eliminada(s)`);
        }

        // Restaurar restricciones FK ─────────────────────────────────────────
        await sequelize.query('SET session_replication_role = DEFAULT;');

        // Re-ejecutar migraciones ─────────────────────────────────────────────
        console.log('\n📦 Re-ejecutando migraciones...\n');
        const { runPendingMigrations } = require('./migrationRunner');
        const migrateResult = await runPendingMigrations();

        if (migrateResult.failed) {
            console.error(`\n❌ Migración falló: ${migrateResult.failed}`);
            process.exit(1);
        }

        // Re-ejecutar seeders ─────────────────────────────────────────────────
        console.log('\n🌱 Re-ejecutando seeders...\n');
        const { runAllSeeds } = require('./seederRunner');
        await runAllSeeds();

        console.log('\n🎉 Base de datos reseteada exitosamente.\n');

    } catch (error) {
        console.error('\n❌ Error durante db:reset:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// ─── Comando: db:setup ──────────────────────────────────────────────────────

/**
 * Ejecuta migraciones pendientes y luego seeders. Atajo para configuración inicial.
 */
async function dbSetup() {
    const sequelize = require('../src/config/db');

    try {
        await sequelize.authenticate();
    } catch (error) {
        console.error('❌ No se pudo conectar a la base de datos:', error.message);
        process.exit(1);
    }

    try {
        // Migraciones ─────────────────────────────────────────────────────────
        console.log('\n📦 Ejecutando migraciones pendientes...\n');
        const { runPendingMigrations } = require('./migrationRunner');
        const result = await runPendingMigrations();

        if (result.failed) {
            console.error(`\n❌ Migración falló: ${result.failed}`);
            process.exit(1);
        }

        // Seeders ─────────────────────────────────────────────────────────────
        console.log('\n🌱 Ejecutando seeders pendientes...\n');
        const { runAllSeeds } = require('./seederRunner');
        await runAllSeeds();

        console.log('\n🎉 Base de datos configurada exitosamente.\n');

    } catch (error) {
        console.error('\n❌ Error durante db:setup:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// ─── Mostrar ayuda ──────────────────────────────────────────────────────────

function showHelp() {
    console.log(`
📚 CLI de Base de Datos — Comandos disponibles:

  Migraciones:
    migrate              Ejecuta migraciones pendientes
    migrate:status       Muestra estado de todas las migraciones
    migrate:rollback     Revierte el último batch (--batch=N para uno específico)
    migrate:create       Genera archivo de migración (<modulo> <nombre>)

  Seeders:
    seed                 Ejecuta seeders pendientes
    seed:status          Muestra estado de todos los seeders

  Utilidades:
    db:create            Crea la BD si no existe, luego migrate + seed (entorno nuevo)
    db:setup             Ejecuta migrate + seed en secuencia (BD ya existente)
    db:reset             Elimina TODO, re-migra y re-siembra (solo desarrollo)
                         Usa --force para saltar confirmación

  Ejemplos:
    npm run migrate
    npm run migrate:create booking add_recurring_fields
    npm run migrate:rollback -- --batch=3
    npm run db:create
    npm run db:reset
    npm run db:reset -- --force
`);
}

// ─── Dispatcher principal ───────────────────────────────────────────────────

async function main() {
    // Comandos que no necesitan conexión a la DB ──────────────────────────────
    if (command === 'migrate:create') {
        await createMigration();
        return;
    }

    if (!command || command === 'help' || command === '--help') {
        showHelp();
        return;
    }

    // db:create maneja su propia conexión ────────────────────────────────────
    if (command === 'db:create') {
        await dbCreate();
        return;
    }

    // db:reset maneja su propia conexión ──────────────────────────────────────
    if (command === 'db:reset') {
        await dbReset();
        return;
    }

    // db:setup maneja su propia conexión ──────────────────────────────────────
    if (command === 'db:setup') {
        await dbSetup();
        return;
    }

    // Los demás comandos necesitan conexión compartida ────────────────────────
    const sequelize = require('../src/config/db');

    try {
        await sequelize.authenticate();
    } catch (error) {
        console.error('❌ No se pudo conectar a la base de datos:', error.message);
        process.exit(1);
    }

    try {
        switch (command) {
            // ── Migraciones ─────────────────────────────────────────────────
            case 'migrate': {
                const { runPendingMigrations } = require('./migrationRunner');
                const result = await runPendingMigrations();
                if (result.failed) process.exitCode = 1;
                break;
            }

            case 'migrate:status': {
                const { getMigrationStatus } = require('./migrationRunner');
                await getMigrationStatus();
                break;
            }

            case 'migrate:rollback': {
                // Bloquear en producción — el rollback puede eliminar columnas o tablas ──
                if (process.env.NODE_ENV === 'production') {
                    console.error('❌ migrate:rollback está BLOQUEADO en producción.');
                    console.error('   Crea una migración forward para revertir cambios de forma segura.');
                    process.exitCode = 1;
                    break;
                }
                const { rollbackBatch } = require('./migrationRunner');
                const batchFlag = getFlag('batch');
                const batch = batchFlag ? parseInt(batchFlag, 10) : null;
                await rollbackBatch(batch);
                break;
            }

            // ── Seeders ─────────────────────────────────────────────────────
            case 'seed': {
                const { runAllSeeds } = require('./seederRunner');
                await runAllSeeds();
                break;
            }

            case 'seed:status': {
                const { getSeederStatus } = require('./seederRunner');
                await getSeederStatus();
                break;
            }

            // ── Comando no reconocido ───────────────────────────────────────
            default:
                console.error(`❌ Comando no reconocido: '${command}'`);
                showHelp();
                process.exitCode = 1;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

main();
