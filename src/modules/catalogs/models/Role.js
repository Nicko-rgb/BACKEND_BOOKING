/**
 * Modelo Role - Gestión de roles de usuario
 * 
 * Este modelo almacena los diferentes roles que pueden ser asignados
 * a los usuarios, definiendo sus permisos y responsabilidades dentro
 * del sistema.
 * 
 * Relaciones:
 * - Tiene muchos UserRole (asignaciones de roles a usuarios)
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Role = sequelize.define('Role', {
    role_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del rol'
    },
    role_name: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        comment: 'Nombre del rol (cliente, administrador, empleado, super_admin)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción detallada del rol y sus responsabilidades'
    },
    app_access: {
        type: DataTypes.ENUM('booking', 'admin', 'both'),
        allowNull: false,
        defaultValue: 'both',
        comment: 'Indica a qué aplicación tiene acceso este rol: booking (clientes), admin (módulo administrador), both (ambos)'
    }
}, {
    tableName: 'dsg_bss_roles',
    timestamps: false,
    comment: 'Catálogo de roles disponibles en el sistema'
});

Role.associate = function (models) {

    // Asociación con UserRole (un rol puede tener múltiples asignaciones a usuarios)
    Role.hasMany(models.UserRole, {
        foreignKey: 'role_id',
        as: 'user_roles',
        onDelete: 'CASCADE'
    });

    // Relación many-to-many con User a través de UserRole
    Role.belongsToMany(models.User, {
        through: models.UserRole,
        foreignKey: 'role_id',
        otherKey: 'user_id',
        as: 'users'
    });

    // Permisos asignados a este rol (tabla role_permissions)
    Role.hasMany(models.RolePermission, {
        foreignKey: 'role_id',
        as: 'rolePermissions',
        onDelete: 'CASCADE'
    });

};

module.exports = Role;
