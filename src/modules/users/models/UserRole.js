/**
 * Modelo UserRole - Gestión de roles de usuario
 * 
 * Este modelo representa la tabla intermedia para la relación muchos a muchos
 * entre usuarios y roles. Permite asignar múltiples roles a un usuario y
 * gestionar permisos específicos por asignación de rol.
 * 
 * Relaciones:
 * - Pertenece a un User (usuario)
 * - Pertenece a un Role (rol)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const UserRole = sequelize.define('UserRole', {
    user_role_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la asignación usuario-rol'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'ID del usuario'
    },
    role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_roles',
            key: 'role_id'
        },
        comment: 'ID del rol'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación del registro'
    }
}, {
    tableName: 'dsg_bss_user_roles', // Tabla: asignaciones de roles a usuarios
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'role_id'],
            name: 'unique_user_role_context'
        },
        {
            fields: ['user_id'],
            name: 'idx_user_active_roles'
        },
        {
            fields: ['role_id'],
            name: 'idx_role_active_assignments'
        }
    ]
});

// Definir asociaciones
UserRole.associate = function (models) {
    // Pertenece a un usuario
    UserRole.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    UserRole.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role'
    });
};

module.exports = UserRole;
