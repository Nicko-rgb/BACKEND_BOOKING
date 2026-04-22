/**
 * Modelo Booking - Gestión de reservas deportivas
 * 
 * Este modelo almacena información de las reservas realizadas por los usuarios
 * para espacios deportivos específicos. Incluye detalles de fecha, hora,
 * estado de la reserva y método de pago.
 * 
 * Relaciones:
 * - Pertenece a un User (usuario que hace la reserva)
 * - Pertenece a un Space (espacio reservado)
 * - Tiene un PaymentBooking (pago asociado)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Booking = sequelize.define('Booking', {
    booking_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la reserva'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Referencia al usuario que hace la reserva',
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        }
    },
    space_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Referencia al espacio deportivo reservado'
    },
    booking_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Fecha de la reserva (YYYY-MM-DD)'
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Hora de inicio de la reserva (HH:MM:SS)'
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Hora de finalización de la reserva (HH:MM:SS)'
    },
    duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Duración de la reserva en minutos (calculado automáticamente)'
    },
    duration_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Duración de la reserva en horas'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW', 'REJECTED'),
        defaultValue: 'PENDING',
        comment: 'Estado actual de la reserva'
    },
    payment_method: {
        type: DataTypes.ENUM('ONLINE', 'IN_PERSON'),
        allowNull: false,
        comment: 'Método de pago seleccionado'
    },
    payment_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Referencia al pago global de PaymentBooking',
        references: {
            model: 'dsg_bss_payment_booking',
            key: 'payment_id'
        }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Monto total de la reserva'
    },
    discount_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Monto de descuento aplicado'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas adicionales de la reserva'
    },
    cancellation_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Razón de cancelación si aplica'
    },
    confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de confirmación'
    },
    approved_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Usuario (admin/owner) que aprobó la reserva presencial',
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        }
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de aprobación de la reserva presencial'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de creación de la reserva'
    }
}, {
    tableName: 'dsg_bss_booking',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla que almacena las reservas de espacios deportivos',
    indexes: [
        {
            // Query más crítica: disponibilidad por espacio/fecha (checkOverlap + findBySpaceAndDate)
            name: 'idx_booking_space_date_status',
            fields: ['space_id', 'booking_date', 'status']
        },
        {
            // checkOverlap de intervalos de tiempo: busca CONFIRMED que se solapen
            name: 'idx_booking_space_time_range',
            fields: ['space_id', 'booking_date', 'start_time', 'end_time']
        },
        {
            // Historial de reservas por usuario (panel del usuario)
            name: 'idx_booking_user',
            fields: ['user_id']
        },
        {
            // Lookup pago → reservas asociadas (PaymentBooking join frecuente)
            name: 'idx_booking_payment',
            fields: ['payment_id']
        }
    ]
});

// Definir asociaciones
Booking.associate = function (models) {
    // Una reserva pertenece a un usuario
    Booking.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // Una reserva pertenece a un espacio deportivo
    Booking.belongsTo(models.Space, {
        foreignKey: 'space_id',
        as: 'space'
    });

    // Una reserva tiene un pago asociado
    // Una reserva pertenece a un único pago que la agrupa
    if (models.PaymentBooking) {
        Booking.belongsTo(models.PaymentBooking, {
            foreignKey: 'payment_id',
            as: 'payment'
        });
    }

    // Una reserva puede tener una calificación
    Booking.hasOne(models.Rating, {
        foreignKey: 'booking_id',
        as: 'rating'
    });
};

module.exports = Booking;
