/**
 * Modelo User - Gestión de usuarios del sistema
 * 
 * Este modelo maneja la información básica de autenticación y contacto de los usuarios.
 * Los usuarios pueden ser clientes que reservan espacios deportivos, administradores
 * de instalaciones, o administradores del sistema.
 * 
 * Relaciones:
 * - Tiene muchos Booking (reservas)
 * - Tiene muchos Rating (calificaciones)
 * - Tiene muchos Notification (notificaciones)
 * - Pertenece a muchos Role a través de UserRole
 * - Tiene una Persona (información personal detallada)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

// Define el modelo User
const User = sequelize.define('User', {
    user_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del usuario'
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Nombre del usuario'
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Apellido del usuario'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        comment: 'Correo electrónico del usuario'
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true, // Permitir null para usuarios de redes sociales
        comment: 'Contraseña del usuario (encriptada)'
    },
    social_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Identificador único del usuario en el proveedor de autenticación social'
    },
    social_provider: {
        type: DataTypes.STRING(50),
        allowNull: true, // 'google', 'facebook', 'apple', etc.
        comment: 'Proveedor de autenticación social (google, facebook, apple, etc.)'
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el usuario está habilitado para autenticarse'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que creó el registro si viene del sistema SYSTEM'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación del registro'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de actualización del registro'
    }
}, {
    tableName: 'dsg_bss_user',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // Índice compuesto para login social (proveedor + id externo) ─────────────────
        {
            name: 'idx_user_social_provider_id',
            fields: ['social_provider', 'social_id']
        },
        // Índice para filtrar usuarios habilitados/deshabilitados ─────────────────────
        {
            name: 'idx_user_is_enabled',
            fields: ['is_enabled']
        }
    ]
});

// Definir asociaciones
User.associate = function (models) {
    // Un usuario tiene una persona con información detallada
    User.hasOne(models.Person, {
        foreignKey: 'user_id',
        as: 'person'
    });

    // Un usuario puede tener múltiples roles
    User.hasMany(models.UserRole, {
        foreignKey: 'user_id'
    });

    // Relación many-to-many con Role a través de UserRole
    User.belongsToMany(models.Role, {
        through: models.UserRole,
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
    });

    // Asociación polimórfica con Media
    User.hasMany(models.Media, {
        foreignKey: 'medible_id',
        constraints: false,
        scope: {
            medible_type: 'User'
        },
        as: 'media'
    });

    // Un usuario puede tener múltiples sucursales favoritas
    User.hasMany(models.UserFavorite, {
        foreignKey: 'user_id',
        as: 'favorites'
    });

    // Un usuario tiene muchas reservas
    User.hasMany(models.Booking, {
        foreignKey: 'user_id',
        as: 'bookings'
    });

    // Un usuario puede dejar muchas calificaciones
    User.hasMany(models.Rating, {
        foreignKey: 'user_id',
        as: 'ratings'
    });

    // Asignaciones del usuario a empresas/sucursales (admin, empleado, super_admin)
    User.hasMany(models.UserCompany, {
        foreignKey: 'user_id',
        as: 'companyAssignments'
    });

    // Permisos directos del usuario (adicionales a los del rol)
    User.hasMany(models.UserPermission, {
        foreignKey: 'user_id',
        as: 'directPermissions'
    });

    // Usurio puede tener quien creo el registro
    User.belongsTo(models.User, {
        foreignKey: 'user_create',
        as: 'creator'
    });
};

module.exports = User;
