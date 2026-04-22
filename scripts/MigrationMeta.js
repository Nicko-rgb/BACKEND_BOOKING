/**
 * MigrationMeta.js
 * Modelo + helpers para control de ejecución de migraciones.
 *
 * Registra qué migraciones ya corrieron en la tabla dsg_bss_migration_meta.
 * Funciona igual que SeedMeta: si el nombre de la migración ya existe
 * con status 'applied', se salta su ejecución.
 *
 * Campos adicionales respecto a SeedMeta:
 *   - module:           módulo al que pertenece la migración
 *   - batch:            agrupa migraciones ejecutadas en la misma corrida (para rollback)
 *   - checksum:         SHA-256 del archivo al momento de ejecución (detección de drift)
 *   - execution_time_ms: duración de la migración en milisegundos
 *   - rolled_back_at:   fecha de rollback (null si no fue revertida)
 *   - status:           'applied' o 'rolled_back'
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../src/config/db');

// ─── Modelo ───────────────────────────────────────────────────────────────────

const MigrationMeta = sequelize.define('MigrationMeta', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    migration_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Nombre completo del archivo de migración'
    },
    module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Módulo al que pertenece la migración (users, facility, etc.)'
    },
    batch: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Número de batch — agrupa migraciones ejecutadas juntas'
    },
    checksum: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'SHA-256 del archivo al momento de ejecución'
    },
    executed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha y hora de ejecución'
    },
    rolled_back_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Fecha y hora de rollback (null si no fue revertida)'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'applied',
        comment: "'applied' o 'rolled_back'"
    },
    execution_time_ms: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duración de la migración en milisegundos'
    }
}, {
    tableName: 'dsg_bss_migration_meta',
    timestamps: false,
    comment: 'Registro de migraciones ejecutadas — evita re-ejecuciones y permite rollback'
});

module.exports = { MigrationMeta };
