/**
 * SeedMeta.js
 * Modelo + helper para control de ejecución de seeds.
 *
 * Registra qué seeds ya corrieron en la tabla dsg_bss_seed_meta.
 * Funciona como un sistema de migraciones: si el nombre del seed ya existe
 * en la tabla, se salta su ejecución. Si no existe, lo ejecuta y lo registra.
 *
 * Uso:
 *   const { runOnce } = require('./SeedMeta');
 *   await runOnce('mySeed', () => seedFn(args));
 *
 * Para re-ejecutar un seed manualmente:
 *   DELETE FROM dsg_bss_seed_meta WHERE seed_name = 'mySeed';
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

// ─── Modelo ───────────────────────────────────────────────────────────────────

const SeedMeta = sequelize.define('SeedMeta', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    seed_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Identificador único del seed — equivale al nombre del archivo'
    },
    executed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora en que el seed fue ejecutado por primera vez'
    }
}, {
    tableName: 'dsg_bss_seed_meta',
    timestamps: false,
    comment: 'Registro de seeds ejecutados — evita re-ejecuciones duplicadas'
});

// ─── Helper runOnce ───────────────────────────────────────────────────────────

/**
 * Ejecuta un seed solo si no fue ejecutado previamente.
 * Silencia console.log durante la ejecución para mantener logs limpios —
 * solo imprime una línea de resultado por seed.
 * console.warn y console.error permanecen activos para no ocultar problemas.
 *
 * @param {string}   seedName - Nombre único del seed (ej: 'ubigeoSeed')
 * @param {Function} seedFn   - Función async del seed a ejecutar
 */
async function runOnce(seedName, seedFn) {
    // Garantizar que la tabla exista antes de consultarla ─────────────────────
    await SeedMeta.sync({ force: false });

    const existing = await SeedMeta.findOne({ where: { seed_name: seedName } });

    if (existing) {
        console.log(`   ⏭️  [${seedName}] ya ejecutado, saltando`);
        return;
    }

    // Silenciar logs y warnings internos del seed ────────────────────────────
    // console.error permanece activo para no ocultar errores reales
    const originalLog  = console.log;
    const originalWarn = console.warn;
    console.log  = () => {};
    console.warn = () => {};

    try {
        await seedFn();
    } finally {
        // Restaurar siempre, incluso si el seed lanza error ───────────────────
        console.log  = originalLog;
        console.warn = originalWarn;
    }

    await SeedMeta.create({ seed_name: seedName, executed_at: new Date() });
    console.log(`   ✅ [${seedName}] ejecutado`);
}

module.exports = { SeedMeta, runOnce };
