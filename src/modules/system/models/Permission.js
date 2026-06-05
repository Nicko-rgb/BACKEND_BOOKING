/**
 * Modelo Permission — Catálogo de permisos del sistema
 *
 * Define todas las acciones posibles que pueden ser otorgadas a roles o usuarios.
 * Los permisos se identifican por una clave única tipo 'modulo.accion'
 * (ej: 'booking.confirm', 'space.manage_own').
 *
 * Relaciones:
 * - Tiene muchos UserPermission (asignaciones directas a usuarios)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Permission = sequelize.define('Permission', {
    permission_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Clave única del permiso, formato modulo.accion (ej: booking.confirm)',
    },
    label: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Nombre legible para mostrar en UI (ej: Confirmar pago)',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción detallada de qué permite hacer este permiso',
    },
    module: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Módulo al que pertenece (booking, facility, users, reports, system)',
    },
    app_access: {
        type: DataTypes.ENUM('booking', 'admin', 'both'),
        allowNull: false,
        defaultValue: 'admin',
        comment: 'En qué app aplica este permiso',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'dsg_bss_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de permisos disponibles en el sistema',
    indexes: [
        // Índice para filtrar permisos por módulo ──────────────────────────────────────
        {
            name: 'idx_permission_module',
            fields: ['module']
        },
        // Índice para filtrar permisos por app (booking, admin, both) ─────────────────
        {
            name: 'idx_permission_app_access',
            fields: ['app_access']
        }
    ]
});

Permission.associate = function (models) {
    Permission.hasMany(models.UserPermission, {
        foreignKey: 'permission_key',
        sourceKey: 'key',
        as: 'userAssignments',
    });
};

module.exports = Permission;
