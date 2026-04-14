/**
 * Modelo Company - Gestión de compañías deportivas
 * 
 * Este modelo almacena información de las compañías que ofrecen
 * instalaciones deportivas. Cada compañía puede tener múltiples
 * espacios deportivos, horarios de funcionamiento y medios.
 *
 * Relaciones:
 * - Pertenece a un Country (país donde se ubica)
 * - Pertenece a un Ubigeo (nivel geográfico: dept/prov/distrito)
 * - Tiene muchos Space (espacios deportivos)
 * - Tiene muchos Media (imágenes y videos)
 * - Puede tener una Company padre (parent_company_id)
 * - Pertenece a un User (usuario que creó el registro)
 * - Pertenece a un User (usuario que actualizó el registro)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Company = sequelize.define('Company', {
    company_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la compañía'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_country',
            key: 'country_id'
        },
        comment: 'Referencia al país donde se ubica la compañía o sucursal'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Nombre de la compañía o sucursal'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Dirección completa de la compañía o sucursal'
    },
    ubigeo_id: {
        type: DataTypes.BIGINT,
        allowNull: false, // Nivel 3 (distrito/ciudad) obligatorio
        references: {
            model: 'dsg_bss_ubigeo',
            key: 'ubigeo_id'
        },
        comment: 'Nivel geográfico asignado — debe ser nivel 3 (distrito/ciudad)'
    },
    phone_cell: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Teléfono celular de contacto'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true, // Opcional — no todas las empresas tienen teléfono fijo
        comment: 'Teléfono fijo de contacto'
    },
    website: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Sitio web de la compañía'
    },
    document: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Número de documento de identificación fiscal' //Aqui la RUC del represante legal
    },
    postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Código postal'
    },
    latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitud de la ubicación'
    },
    longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitud de la ubicación'
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
        defaultValue: 'ACTIVE',
        comment: 'Estado de la sucursal' // Netamente para las sucursales
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción de la compañía'
    },
    parking_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indica si tiene estacionamiento disponible'
    },
    opening_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Horario de apertura (para sucursales)'
    },
    closing_time: {
        type: DataTypes.TIME,
        allowNull: true,
        comment: 'Horario de cierre (para sucursales)'
    },
    min_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Precio mínimo (para sucursales)'
    },
    features: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Características de la sucursal (separadas por comas)'
    },
    parent_company_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        },
        comment: 'Referencia a la compañía padre (para sucursales)'
    },
    is_enabled: {
        type: DataTypes.ENUM('A', 'I'),
        allowNull: false,
        comment: 'Flag de habilitación'
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
    tableName: 'dsg_bss_company',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Tabla de compañías y sucursales deportivas',
    indexes: [
        // Nota: sin UNIQUE global en 'document' — las sucursales heredan y comparten
        // el RUC/NIT de su empresa madre. La unicidad se valida en CompanyService
        // solo para empresas padre (parent_company_id IS NULL).

        // Índice para filtrar sucursales de un tenant ──────────────────────────────────
        {
            name: 'idx_company_tenant_id',
            fields: ['tenant_id']
        },
        // Índice para filtrar empresas/sucursales por país ─────────────────────────────
        {
            name: 'idx_company_country_id',
            fields: ['country_id']
        },
        // Índice para obtener el ubigeo asignado a una empresa ────────────────────────
        {
            name: 'idx_company_ubigeo_id',
            fields: ['ubigeo_id']
        },
        // Índice para cargar sucursales de una empresa padre ───────────────────────────
        {
            name: 'idx_company_parent_company_id',
            fields: ['parent_company_id']
        },
        // Índice compuesto para listar sucursales activas/habilitadas ──────────────────
        {
            name: 'idx_company_status_enabled',
            fields: ['status', 'is_enabled']
        }
    ]
});

// Definir asociaciones
Company.associate = function (models) {
    // Pertenece a un país ────────────────────────────────────────────────────
    Company.belongsTo(models.Country, {
        foreignKey: 'country_id',
        as: 'country'
    });

    // Pertenece a un nivel geográfico ubigeo (opcional) ────────────────────
    if (models.Ubigeo) {
        Company.belongsTo(models.Ubigeo, {
            foreignKey: 'ubigeo_id',
            as: 'ubigeo'
        });
    }

    // Tiene muchos espacios deportivos
    Company.hasMany(models.Space, {
        foreignKey: 'sucursal_id',
        as: 'spaces'
    });

    // Tiene muchos medios (imágenes, videos) - Asociación Polimórfica
    Company.hasMany(models.Media, {
        foreignKey: 'medible_id',
        constraints: false,
        scope: {
            medible_type: 'Company'
        },
        as: 'media'
    });

    // Auto-referencia para compañías padre
    Company.belongsTo(Company, {
        foreignKey: 'parent_company_id',
        as: 'parentCompany'
    });

    // Recursividad a si misma
    Company.hasMany(Company, {
        foreignKey: 'parent_company_id',
        as: 'subsidiaries'
    });

    // Tiene configuraciones de pago
    Company.hasMany(models.ConfigurationPayment, {
        foreignKey: 'sucursal_id',
        as: 'paymentConfigurations'
    });

    // Tiene una configuración detallada
    Company.hasOne(models.Configuration, {
        foreignKey: 'company_id',
        as: 'configuration'
    });

    // Tiene muchas calificaciones (ratings)
    Company.hasMany(models.Rating, {
        foreignKey: 'sucursal_id',
        as: 'ratings'
    });

    // Tiene muchos favoritos de usuarios
    Company.hasMany(models.UserFavorite, {
        foreignKey: 'sucursal_id',
        as: 'favoritedBy'
    });

    // Tiene muchas notificaciones
    Company.hasMany(models.Notification, {
        foreignKey: 'company_id',
        as: 'notifications'
    });

    // Usuarios asignados a esta empresa/sucursal (admins, empleados, super_admins)
    Company.hasMany(models.UserCompany, {
        foreignKey: 'company_id',
        as: 'userAssignments'
    });

    // Relación con usuario que creó el registro
    Company.belongsTo(models.User, {
        foreignKey: 'user_create',
        as: 'creator'
    });

    // Relación con usuario que actualizó el registro
    Company.belongsTo(models.User, {
        foreignKey: 'user_update',
        as: 'updater'
    });
};

module.exports = Company;