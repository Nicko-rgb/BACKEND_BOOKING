/**
 * PaymentBooking Model - Gestión de pagos de reservas
 * 
 * Este modelo almacena la información de los pagos realizados
 * para las reservas deportivas, incluyendo método de pago,
 * estado y detalles de la transacción.
 * 
 * Relaciones:
 * - Pertenece a una Booking (reserva deportiva)
 * - Pertenece a un PaymentType (tipo de pago)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const PaymentBooking = sequelize.define('PaymentBooking', {
    payment_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del pago'
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
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Monto del pago'
    },
    method: {
        type: DataTypes.ENUM('ONLINE', 'IN_PERSON'),
        allowNull: false,
        comment: 'Método de pago'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'AWAITING_APPROVAL', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED'),
        allowNull: false,
        defaultValue: 'PENDING',
        comment: 'Estado del pago'
    },
    payment_reference: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Referencia externa del pago'
    },
    transaction_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID de transacción del gateway de pago'
    },
    comision_aplicada: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Comisión aplicada al pago'
    },
    moneda: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'PEN',
        comment: 'Código de moneda (ISO 4217)'
    },
    payment_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha en que se completó el pago'
    },
    payment_gateway: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Gateway de pago utilizado (stripe, paypal, mercadopago, etc.)'
    },
    gateway_response: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Respuesta completa del gateway de pago'
    },

    // ── Campos exclusivos de pago en efectivo presencial ──────────
    scheduled_payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha comprometida por el cliente para ir a pagar en efectivo (YYYY-MM-DD)'
    },
    scheduled_payment_time: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Franja horaria preferida para ir a pagar (ej: "10:00 AM - 12:00 PM")'
    },
    contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Teléfono de contacto del cliente para recordatorios del pago en efectivo'
    },

    // ── Comprobante de pago (Yape / Plin / Bank Transfer) ─────────
    payment_proof_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL de la imagen del comprobante de pago subida por el cliente'
    },
    
    payment_proof_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Número de comprobante de pago (Yape / Plin / Bank Transfer)'
    },
    // ── Confirmación por el admin/staff ───────────────────────────
    cash_received_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp exacto en que el admin/staff recibió el dinero físicamente'
    },
    cash_received_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'user_id del empleado/admin que recibió el efectivo',
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        }
    },
    cash_receipt_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Número de comprobante/recibo físico entregado al cliente'
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
    tableName: 'dsg_bss_payment_booking',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_payment_type',
            fields: ['payment_type_id']
        },
        {
            name: 'idx_payment_status',
            fields: ['status']
        },
        {
            name: 'idx_payment_date',
            fields: ['payment_date']
        },
        {
            name: 'idx_payment_tenant',
            fields: ['tenant_id']
        }
    ],
    comment: 'Tabla de pagos de reservas'
});

// Definir asociaciones
PaymentBooking.associate = function (models) {
    // Tiene muchas Bookings (reservas deportivas asociadas a este pago unitario)
    if (models.Booking) {
        PaymentBooking.hasMany(models.Booking, {
            foreignKey: 'payment_id',
            as: 'bookings'
        });
    }

    // Pertenece a un PaymentType (tipo de pago)
    PaymentBooking.belongsTo(models.PaymentType, {
        foreignKey: 'payment_type_id',
        as: 'payment_type'
    });
};

module.exports = PaymentBooking;