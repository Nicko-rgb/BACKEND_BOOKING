const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

/**
 * Modelo BookingHold - Maneja los bloqueos temporales de 5-10 minutos
 * Esto evita llenar la tabla 'Booking' con intentos fallidos o expirados.
 */
const BookingHold = sequelize.define('BookingHold', {
    hold_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    space_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_space',
            key: 'space_id'
        }
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        }
    },
    booking_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    },
    extension_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    extension_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED'),
        defaultValue: 'ACTIVE'
    }
}, {
    tableName: 'dsg_bss_booking_hold',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            // Query principal: disponibilidad por espacio/fecha (la más frecuente, usada en checkOverlap y findBySpaceAndDate)
            name: 'idx_hold_space_date_status',
            fields: ['space_id', 'booking_date', 'status']
        },
        {
            // Job de expiración: busca holds activos vencidos cada N segundos
            name: 'idx_hold_expires_status',
            fields: ['status', 'expires_at']
        },
        {
            // Cancelación y limpieza por usuario (deleteUserHolds, getAndDeleteUserHolds)
            name: 'idx_hold_user_status',
            fields: ['user_id', 'status']
        },
        {
            // Barrera anti race-condition: evita dos holds activos para el mismo slot exacto
            // Si hay colisión, la BD lanza error que capturamos en BookingService
            name: 'idx_hold_unique_active_slot',
            unique: true,
            fields: ['space_id', 'booking_date', 'start_time', 'end_time', 'status']
        }
    ]
});

module.exports = BookingHold;