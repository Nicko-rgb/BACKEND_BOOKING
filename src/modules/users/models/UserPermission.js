/**
 * Modelo UserPermission — Permisos directos por usuario
 *
 * Permite otorgar permisos extra a un usuario específico más allá
 * de los que hereda por su rol. Útil para casos borde sin cambiar el rol.
 *
 * Regla de resolución:
 *   permisos_efectivos = permisos_del_rol ∪ permisos_directos_del_usuario
 *
 * Relaciones:
 * - Pertenece a un User
 * - Referencia una clave de Permission
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const UserPermission = sequelize.define('UserPermission', {
    user_permission_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id',
        },
    },
    permission_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Clave del permiso (FK lógica a dsg_bss_permissions.key)',
    },
    granted_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id',
        },
        comment: 'Usuario que otorgó este permiso directo',
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
    tableName: 'dsg_bss_user_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'permission_key'],
            name: 'unique_user_permission',
        },
        {
            fields: ['user_id'],
            name: 'idx_user_permission_user',
        },
    ],
    comment: 'Permisos directos otorgados a usuarios individuales',
});

UserPermission.associate = function (models) {
    UserPermission.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
    });

    UserPermission.belongsTo(models.User, {
        foreignKey: 'granted_by',
        as: 'grantedByUser',
    });
};

module.exports = UserPermission;
