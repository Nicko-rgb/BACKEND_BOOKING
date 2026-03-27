/**
 * Modelo ConfigurationPayment - Configuración de pagos de la sucursal
 * 
 * Este modelo almacena información de configuración de pagos de la sucursal,
 * como tipos de pago y preferencias de pago.
 * 
 * Relaciones:
 * - Pertenece a una Company (sucursal)
 * - Pertenece a un PaymentType (tipo de pago)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const ConfigurationPayment = sequelize.define('ConfigurationPayment', {
    configuration_payment_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID de la sucursal (el modelo Company tiene recursividad a si misma por lo que se usa sucursal_id)',
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        }
    },
    payment_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del tipo de pago',
        references: {
            model: 'dsg_bss_payment_types',
            key: 'payment_type_id'
        }
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si es el tipo de pago por defecto'
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Orden de visualización'
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si el método de pago está disponible en la sucursal'
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
    tableName: 'dsg_bss_configuration_payment',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['sucursal_id', 'payment_type_id'], name: 'unique_configuration_payment' },
        { fields: ['sucursal_id'], name: 'idx_configuration_payment_company' },
        { fields: ['payment_type_id'], name: 'idx_configuration_payment_type' }
    ],
    comment: 'Configuración de métodos de pago para sucursales(company)'
});

// Definir asociaciones
ConfigurationPayment.associate = function (models) {
    // Asociación con Company (sucursal)
    ConfigurationPayment.belongsTo(models.Company, {
        foreignKey: 'sucursal_id',
        as: 'company',
        allowNull: false
    });
    // Asociación con PaymentType (tipo de pago)
    ConfigurationPayment.belongsTo(models.PaymentType, {
        foreignKey: 'payment_type_id',
        as: 'payment_type',
        allowNull: false
    });

    // Asociación con User (creador)
    ConfigurationPayment.belongsTo(models.User, {
        foreignKey: 'user_create',
        as: 'creator'
    });

    // Asociación con User (actualizador)
    ConfigurationPayment.belongsTo(models.User, {
        foreignKey: 'user_update',
        as: 'updater'
    });

    // Una configuración de pago puede tener múltiples cuentas (Yape, Plin, banco, etc.)
    ConfigurationPayment.hasMany(models.PaymentAccount, {
        foreignKey: 'configuration_payment_id',
        as: 'paymentAccounts'
    });
}

module.exports = ConfigurationPayment;