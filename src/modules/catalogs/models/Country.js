/**
 * Modelo Country - Gestión de países del sistema
 *
 * Este modelo almacena información de los países donde opera el sistema
 * de reservas deportivas. Incluye datos como moneda, código de país,
 * zona horaria y configuraciones específicas por región.
 *
 * Relaciones:
 * - Tiene muchas Companies (instalaciones deportivas)
 * - Tiene muchos Ubigeo de nivel 1 (departamentos/estados del país)
 * - Tiene muchos PaymentType (tipos de pago disponibles en el país)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Country = sequelize.define('Country', {
    country_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del país'
    },
    iso_country: {
        type: DataTypes.STRING(3),
        allowNull: false,
        comment: 'Código ISO del país (ej: PER, COL, ARG)'
    },
    phone_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Código telefónico del país (ej: +51, +57, +54)'
    },
    iso_currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        comment: 'Código de moneda ISO (ej: PEN, COP, ARS)'
    },
    currency: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Nombre de la moneda (ej: Sol Peruano, Peso Colombiano)'
    },
    currency_simbol: {
        type: DataTypes.STRING(5),
        allowNull: false,
        comment: 'Símbolo de la moneda (ej: S/, $, €)'
    },
    time_zone: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Zona horaria principal (ej: America/Lima, America/Bogota)'
    },
    language: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Código del idioma principal (ej: es, en, pt)'
    },
    date_format: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Formato de fecha preferido en el país'
    },
    flag_url: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'URL de la imagen de la bandera del país'
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
    },
}, {
    tableName: 'dsg_bss_country',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla que almacena información de países donde opera el sistema',
    indexes: [
        // Índice único para código ISO del país (PER, COL, ARG, etc.) ─────────────────
        {
            name: 'idx_country_iso_unique',
            unique: true,
            fields: ['iso_country']
        },
        // Índice para filtrar por idioma ───────────────────────────────────────────────
        {
            name: 'idx_country_language',
            fields: ['language']
        }
    ]
});

// Definir asociaciones
Country.associate = function (models) {
    // Un país tiene muchos registros geográficos de nivel 1 (departamentos/estados) ──
    Country.hasMany(models.Ubigeo, {
        foreignKey: 'country_id',
        as: 'ubigeos'
    });

    // Un país tiene muchas compañías/instalaciones ─────────────────────────────────
    Country.hasMany(models.Company, {
        foreignKey: 'country_id',
        as: 'companies'
    });

    // Un país tiene muchos tipos de pago disponibles ───────────────────────────────
    Country.hasMany(models.PaymentType, {
        foreignKey: 'country_id',
        as: 'paymentTypes'
    });
};

module.exports = Country;