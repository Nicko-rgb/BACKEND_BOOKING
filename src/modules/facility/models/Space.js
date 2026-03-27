/**
 * Modelo Space - Gestión de espacios deportivos
 * 
 * Este modelo almacena información de los espacios deportivos
 * disponibles para reserva. Cada espacio pertenece a una sucursal y 
 * a una compañía propietaria.
 * y tiene características específicas como tipo de superficie,
 * deporte, capacidad y tarifas.
 * 
 * Relaciones:
 * - Pertenece a una Company (compañía propietaria)
 * - Pertenece a una Sucursal (sucursal específica)
 * - Pertenece a un SurfaceType (tipo de superficie)
 * - Pertenece a un SportType (tipo de deporte)
 * - Pertenece a un SportCategory (categoría deportiva)
 * - Tiene muchos Media (imágenes y videos)
 * - Tiene muchos Booking (reservas)
 * - Tiene muchos Rating (calificaciones)
 * - Tiene muchos BusinessHour (horarios de funcionamiento)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Space = sequelize.define('Space', {
    space_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del espacio deportivo'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        },
        comment: 'Referencia a la sucursal específica'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del espacio deportivo'
    },
    surface_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_surface_type',
            key: 'surface_type_id'
        },
        comment: 'Tipo de superficie del espacio'
    },
    sport_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_sport_type',
            key: 'sport_type_id'
        },
        comment: 'Tipo de deporte principal'
    },
    sport_category_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_sport_category',
            key: 'sport_category_id'
        },
        comment: 'Categoría deportiva'
    },
    status_space: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
        allowNull: false,
        comment: 'Estado del espacio deportivo'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del espacio deportivo'
    },
    capacity: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Capacidad máxima de personas'
    },
    dimensions: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Dimensiones del espacio (ej: 20x40 metros)'
    },
    equipment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Equipamientos del espacio deportivo (separadas por comas)'
    },
    minimum_booking_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 60,
        comment: 'Mínimo de minutos para reserva (ej: 60 para 1 hora)'
    },
    maximum_booking_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 480,
        comment: 'Máximo de minutos para reserva (ej: 480 para 8 horas)'
    },
    booking_buffer_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
        comment: 'Minutos de buffer entre reservas'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que creó el registro'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que actualizó el registro'
    }
}, {
    tableName: 'dsg_bss_space',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Tabla de espacios deportivos',
    indexes: [
        {
            name: 'idx_space_sucursal',
            fields: ['sucursal_id']
        },
        {
            name: 'idx_space_surface_type',
            fields: ['surface_type_id']
        },
        {
            name: 'idx_space_sport_category',
            fields: ['sport_category_id']
        },
        {
            name: 'idx_space_sport_type',
            fields: ['sport_type_id']
        },
        {
            name: 'idx_space_tenant',
            fields: ['tenant_id']
        }
    ]
});

// Definir asociaciones
Space.associate = function (models) {
    // Pertenece a una sucursal específica (instalación)
    Space.belongsTo(models.Company, {
        foreignKey: 'sucursal_id',
        as: 'sucursal'
    });

    // Pertenece a un tipo de superficie
    Space.belongsTo(models.SurfaceType, {
        foreignKey: 'surface_type_id',
        as: 'surfaceType'
    });

    // Pertenece a un tipo de deporte
    Space.belongsTo(models.SportType, {
        foreignKey: 'sport_type_id',
        as: 'sportType'
    });

    // Pertenece a una categoría deportiva
    Space.belongsTo(models.SportCategory, {
        foreignKey: 'sport_category_id',
        as: 'sportCategory'
    });

    // Tiene muchos horarios de funcionamiento específicos
    Space.hasMany(models.BusinessHour, {
        foreignKey: 'space_id',
        as: 'businessHours'
    });

    // Tiene muchos medios (imágenes, videos) - Asociación Polimórfica
    Space.hasMany(models.Media, {
        foreignKey: 'medible_id',
        constraints: false,
        scope: {
            medible_type: 'Space'
        },
        as: 'media'
    });

    // Tiene muchas reservas
    Space.hasMany(models.Booking, {
        foreignKey: 'space_id',
        as: 'bookings'
    });

    // Relación con usuario que creó el registro
    Space.belongsTo(models.User, {
        foreignKey: 'user_create',
        as: 'creator'
    });

    // Relación con usuario que actualizó el registro
    Space.belongsTo(models.User, {
        foreignKey: 'user_update',
        as: 'updater'
    });
};

module.exports = Space;
