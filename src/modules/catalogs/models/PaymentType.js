/**
 * Modelo PaymentType - Gestión de tipos de pago por país
 * 
 * Este modelo almacena los diferentes métodos de pago disponibles
 * en cada país, incluyendo configuraciones específicas como comisiones,
 * límites de transacción y proveedores de pago.
 * 
 * Relaciones:
 * - Pertenece a un País (país donde está disponible)
 * - Tiene muchos PaymentBooking (pagos realizados con este tipo)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const PaymentType = sequelize.define('PaymentType', {
    payment_type_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_country',
            key: 'country_id'
        },
        comment: 'Referencia al país donde está disponible este tipo de pago'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del tipo de pago (ej: Tarjeta de Crédito, PSE, Nequi, Yape)'
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Código único del tipo de pago (ej: CREDIT_CARD, PSE, NEQUI)'
    },
    category: {
        type: DataTypes.ENUM('tarjeta_credito', 'tarjeta_debito', 'transferencia_bancaria', 'billetera_digital', 'efectivo', 'criptomoneda'),
        allowNull: false,
        comment: 'Categoría del tipo de pago'
    },
    provider: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Proveedor del servicio de pago (ej: Mercado Pago, PayU, Stripe)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción detallada del tipo de pago'
    },
    icon_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'URL del icono representativo del tipo de pago'
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el tipo de pago está activo en el sistema'
    },
    processing_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Tiempo estimado de procesamiento (ej: Inmediato, 1-3 días)'
    },
    commission_percentage: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        defaultValue: 0.0000,
        comment: 'Porcentaje de comisión (ej: 0.0350 = 3.5%)'
    },
    fixed_commission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Comisión fija por transacción'
    },
    min_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Monto mínimo permitido para este tipo de pago'
    },
    max_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Monto máximo permitido para este tipo de pago'
    },
    api_config: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Configuración específica de la API del proveedor (JSON)'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación del registro'
    }
}, {
    tableName: 'dsg_bss_payment_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['country_id', 'code'], // Un código único por país
            name: 'unique_payment_type_por_country'
        },
        {
            fields: ['category'],
            name: 'idx_category_payment_type'
        },
        {
            fields: ['is_enabled'],
            name: 'idx_is_enabled_payment_type'
        }
    ],
    comment: 'Tabla que almacena los tipos de pago disponibles por país'
});

PaymentType.associate = function (models) {

    // Asociación con Country (un tipo de pago pertenece a un país)
    PaymentType.belongsTo(models.Country, {
        foreignKey: 'country_id',
        as: 'country',
        allowNull: false
    });


    // Asociación con PaymentBooking (un tipo de pago puede tener múltiples pagos)
    PaymentType.hasMany(models.PaymentBooking, {
        foreignKey: 'payment_type_id',
        as: 'payments',
        onDelete: 'CASCADE'
    });

};

module.exports = PaymentType;
