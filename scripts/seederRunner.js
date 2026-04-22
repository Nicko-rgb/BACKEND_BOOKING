/**
 * seederRunner.js
 * Motor de seeders por módulo — reemplaza src/seeds/indexSeed.js.
 *
 * Descubre seeders distribuidos en cada módulo, los ejecuta en orden
 * de dependencia (moduleOrder.js), y reutiliza la tabla dsg_bss_seed_meta
 * para compatibilidad con registros de producción existentes.
 *
 * Cada archivo de seeder exporta:
 *   - seedName:    string  — nombre único (debe coincidir con el ya registrado en producción)
 *   - seedFn:      function(systemUserId?) — función async que ejecuta el seed
 *   - environment: 'essential' | 'demo' — los demo se saltan en producción
 *   - dependsOnSystemUser: boolean (opcional) — true si necesita systemUserId como argumento
 *   - order:       number  — orden global de ejecución (resuelve dependencias cruzadas entre módulos)
 */

const fs = require('fs');
const path = require('path');
const { MODULE_ORDER } = require('./moduleOrder');
const { SeedMeta, runOnce } = require('./SeedMeta');

// Ruta base a los módulos ─────────────────────────────────────────────────────
const MODULES_DIR = path.join(__dirname, '..', 'src', 'modules');

// ─── Descubrimiento de seeders ──────────────────────────────────────────────

/**
 * Descubre todos los seeders disponibles, ordenados por módulo y nombre.
 * @returns {Array<{name: string, module: string, filePath: string, config: object}>}
 */
function discoverSeeders() {
    const seeders = [];

    for (const moduleName of MODULE_ORDER) {
        const seedersDir = path.join(MODULES_DIR, moduleName, 'database', 'seeders');

        // Si el módulo no tiene directorio de seeders, saltar ─────────────────
        if (!fs.existsSync(seedersDir)) continue;

        // Buscar archivos .js ordenados lexicográficamente ────────────────────
        const files = fs.readdirSync(seedersDir)
            .filter(f => f.endsWith('.js'))
            .sort();

        for (const file of files) {
            const filePath = path.join(seedersDir, file);
            const config = require(filePath);

            seeders.push({
                name: file,
                module: moduleName,
                filePath,
                config
            });
        }
    }

    // Ordenar por campo 'order' para respetar dependencias cruzadas ─────────
    seeders.sort((a, b) => (a.config.order || 999) - (b.config.order || 999));

    return seeders;
}

// ─── Obtener systemUserId ───────────────────────────────────────────────────

/**
 * Recupera el ID del usuario system de la base de datos.
 * Necesario para seeders que crean registros con user_create.
 * @returns {number|null}
 */
async function getSystemUserId() {
    const { User } = require('../src/modules/users/models');
    const systemEmail = process.env.SYSTEM_SEED_EMAIL || 'system@gmail.com';
    const systemUser = await User.findOne({ where: { email: systemEmail } });
    return systemUser?.user_id || null;
}

// ─── Ejecución de seeders ───────────────────────────────────────────────────

/**
 * Ejecuta todos los seeders pendientes en orden de dependencia.
 * En producción solo ejecuta los seeders 'essential'.
 */
async function runAllSeeds() {
    const isProduction = process.env.NODE_ENV === 'production';
    const seeders = discoverSeeders();

    if (seeders.length === 0) {
        console.log('  No se encontraron seeders.');
        return;
    }

    console.log('🌱 Iniciando población de datos...\n');

    // Separar esenciales y demo ───────────────────────────────────────────────
    const essential = seeders.filter(s => s.config.environment === 'essential');
    const demo = seeders.filter(s => s.config.environment === 'demo');

    // Ejecutar seeders esenciales ─────────────────────────────────────────────
    console.log('🌱 Poblando datos esenciales del sistema...');
    let systemUserId = null;

    for (const seeder of essential) {
        const { seedName, seedFn, dependsOnSystemUser } = seeder.config;

        await runOnce(seedName, async () => {
            // Ejecutar seed con o sin systemUserId ────────────────────────────
            if (dependsOnSystemUser && systemUserId) {
                const result = await seedFn(systemUserId);
                // Si el seed retorna un systemUserId, guardarlo ──────────────
                if (result && typeof result === 'number') systemUserId = result;
            } else {
                const result = await seedFn();
                if (result && typeof result === 'number') systemUserId = result;
            }
        });

        // Recuperar systemUserId de la DB si el seed ya fue ejecutado ─────────
        if (seedName === 'systemUserSeed' && !systemUserId) {
            systemUserId = await getSystemUserId();
        }
    }

    // Ejecutar seeders de demo solo en entornos no productivos ────────────────
    if (!isProduction && demo.length > 0) {
        console.log('🧪 Poblando datos de demo (desarrollo)...');
        for (const seeder of demo) {
            const { seedName, seedFn, dependsOnSystemUser } = seeder.config;
            await runOnce(seedName, async () => {
                if (dependsOnSystemUser && systemUserId) {
                    await seedFn(systemUserId);
                } else {
                    await seedFn();
                }
            });
        }
    } else if (isProduction) {
        console.log('⚠️  Entorno producción: seeds de demo omitidos.');
    }

    console.log('\n🎉 ¡Todos los datos han sido poblados exitosamente!');
}

// ─── Estado de seeders ──────────────────────────────────────────────────────

/**
 * Muestra el estado de todos los seeders descubiertos.
 * Indica cuáles ya fueron ejecutados y cuáles están pendientes.
 */
async function getSeederStatus() {
    // Garantizar que la tabla exista ──────────────────────────────────────────
    await SeedMeta.sync({ force: false });

    // Obtener seeders ejecutados ──────────────────────────────────────────────
    const executedRows = await SeedMeta.findAll();
    const executedMap = new Map(executedRows.map(r => [r.seed_name, r]));

    // Descubrir todos los seeders ─────────────────────────────────────────────
    const seeders = discoverSeeders();

    if (seeders.length === 0) {
        console.log('  No se encontraron seeders.');
        return { total: 0, executed: 0, pending: 0 };
    }

    console.log('\n📋 Estado de seeders:\n');

    let pendingCount = 0;
    let currentModule = '';

    for (const seeder of seeders) {
        // Encabezado por módulo ───────────────────────────────────────────────
        if (seeder.module !== currentModule) {
            currentModule = seeder.module;
            console.log(`  ── ${currentModule} ${'─'.repeat(50 - currentModule.length)}`);
        }

        const { seedName, environment } = seeder.config;
        const executed = executedMap.get(seedName);
        const envTag = environment === 'demo' ? ' [demo]' : '';

        if (executed) {
            const date = new Date(executed.executed_at).toISOString().split('T')[0];
            console.log(`  ✅ ${seedName}${envTag}  [${date}]`);
        } else {
            pendingCount++;
            console.log(`  ⏳ ${seedName}${envTag}  — PENDIENTE`);
        }
    }

    const executedCount = seeders.length - pendingCount;
    console.log(`\n  Total: ${seeders.length} | Ejecutados: ${executedCount} | Pendientes: ${pendingCount}\n`);

    return { total: seeders.length, executed: executedCount, pending: pendingCount };
}

module.exports = { runAllSeeds, getSeederStatus };
