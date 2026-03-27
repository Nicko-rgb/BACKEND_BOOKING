/**
 * Modelo RolePermission — Permisos asignados a un rol
 *
 * Tabla intermedia que vincula roles con sus permisos.
 * Reemplaza el campo JSON `permissions` de la tabla dsg_bss_roles,
 * haciendo los permisos administrables desde la UI.
 *
 * Relaciones:
 * - Pertenece a un Role
 * - Referencia una clave de Permission
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const RolePermission = sequelize.define('RolePermission', {
    role_permission_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_roles',
            key: 'role_id',
        },
    },
    permission_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Clave del permiso (FK lógica a dsg_bss_permissions.key)',
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'dsg_bss_role_permissions',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['role_id', 'permission_key'],
            name: 'unique_role_permission',
        },
        {
            fields: ['role_id'],
            name: 'idx_role_permission_role',
        },
    ],
    comment: 'Permisos asignados a cada rol',
});

RolePermission.associate = function (models) {
    RolePermission.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role',
    });
};

module.exports = RolePermission;
