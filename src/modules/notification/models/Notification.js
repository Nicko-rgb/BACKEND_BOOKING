/**
 * Notification Model - Sistema de notificaciones
 * 
 * Este modelo almacena las notificaciones para clientes a través
 * de múltiples canales (in-app, email, SMS, push) con seguimiento
 * de entrega y programación.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Notification = sequelize.define('Notification', {
    notification_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la notificación'
    },
    client_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del cliente que recibe la notificación',
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        }
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID de la compañía que envía la notificación',
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        }
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Título de la notificación'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Contenido del mensaje de la notificación'
    },
    notification_type: {
        type: DataTypes.ENUM(
            'BOOKING_CONFIRMATION',
            'BOOKING_REMINDER',
            'BOOKING_CANCELLATION',
            'PAYMENT_SUCCESS',
            'PAYMENT_FAILED',
            'PAYMENT_REMINDER',
            'FACILITY_UPDATE',
            'PROMOTION',
            'SYSTEM_MAINTENANCE',
            'WELCOME',
            'PASSWORD_RESET',
            'ACCOUNT_VERIFICATION',
            'GENERAL'
        ),
        allowNull: false,
        defaultValue: 'GENERAL',
        comment: 'Tipo de notificación'
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        allowNull: false,
        defaultValue: 'NORMAL',
        comment: 'Nivel de prioridad'
    },
    channel: {
        type: DataTypes.ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH'),
        allowNull: false,
        defaultValue: 'IN_APP',
        comment: 'Canal de entrega'
    },
    read_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la notificación ha sido leída'
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se leyó la notificación'
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora en que se envió la notificación'
    },
    scheduled_for: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora programada para el envío'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha y hora de expiración de la notificación'
    },
    related_entity_type: {
        type: DataTypes.ENUM('BOOKING', 'PAYMENT', 'FACILITY', 'USER', 'SPACE'),
        allowNull: true,
        comment: 'Tipo de entidad relacionada'
    },
    related_entity_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'ID de la entidad relacionada'
    },
    action_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL para la acción de la notificación'
    },
    action_text: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Texto del botón de acción'
    },
    delivery_status: {
        type: DataTypes.ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'),
        allowNull: false,
        defaultValue: 'PENDING',
        comment: 'Estado de entrega'
    },
    delivery_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número de intentos de entrega'
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Metadatos adicionales de la notificación'
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
    tableName: 'dsg_bss_notification',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            name: 'idx_notification_client',
            fields: ['client_id']
        },
        {
            name: 'idx_notification_company',
            fields: ['company_id']
        },
        {
            name: 'idx_notification_type',
            fields: ['notification_type']
        },
        {
            name: 'idx_notification_status',
            fields: ['delivery_status']
        },
        {
            name: 'idx_notification_read',
            fields: ['client_id', 'read_status']
        },
        {
            name: 'idx_notification_scheduled',
            fields: ['scheduled_for']
        },
        {
            name: 'idx_notification_tenant',
            fields: ['tenant_id']
        }
    ],
    comment: 'Tabla de notificaciones del sistema'
});

// Definir asociaciones
Notification.associate = function (models) {
    // Una notificación pertenece a un usuario (cliente)
    Notification.belongsTo(models.User, {
        foreignKey: 'client_id',
        as: 'user'
    });

    // Una notificación pertenece a una compañía
    Notification.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
    });
};

module.exports = Notification;