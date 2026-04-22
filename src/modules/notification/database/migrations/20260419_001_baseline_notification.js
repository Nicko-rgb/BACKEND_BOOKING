/**
 * Baseline: crear tabla dsg_bss_notification
 * Notificaciones del sistema a usuarios (in-app, email, SMS, push).
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_notification',
        module: 'notification'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_notification') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_notification ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_notification', {
            notification_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            client_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            title: { type: DataTypes.STRING(255), allowNull: false },
            message: { type: DataTypes.TEXT, allowNull: false },
            notification_type: {
                type: DataTypes.ENUM(
                    'BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'BOOKING_CANCELLATION',
                    'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_REMINDER',
                    'FACILITY_UPDATE', 'PROMOTION', 'SYSTEM_MAINTENANCE',
                    'WELCOME', 'PASSWORD_RESET', 'ACCOUNT_VERIFICATION', 'GENERAL'
                ),
                allowNull: false,
                defaultValue: 'GENERAL'
            },
            priority: {
                type: DataTypes.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
                allowNull: false,
                defaultValue: 'NORMAL'
            },
            channel: {
                type: DataTypes.ENUM('IN_APP', 'EMAIL', 'SMS', 'PUSH'),
                allowNull: false,
                defaultValue: 'IN_APP'
            },
            read_status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            read_at: { type: DataTypes.DATE, allowNull: true },
            sent_at: { type: DataTypes.DATE, allowNull: true },
            scheduled_for: { type: DataTypes.DATE, allowNull: true },
            expires_at: { type: DataTypes.DATE, allowNull: true },
            related_entity_type: {
                type: DataTypes.ENUM('BOOKING', 'PAYMENT', 'FACILITY', 'USER', 'SPACE'),
                allowNull: true
            },
            related_entity_id: { type: DataTypes.BIGINT, allowNull: true },
            action_url: { type: DataTypes.STRING(500), allowNull: true },
            action_text: { type: DataTypes.STRING(100), allowNull: true },
            delivery_status: {
                type: DataTypes.ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'),
                allowNull: false,
                defaultValue: 'PENDING'
            },
            delivery_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            metadata: { type: DataTypes.JSONB, allowNull: true },
            user_create: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_update: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: true },
            updated_at: { type: DataTypes.DATE, allowNull: true }
        });

        await queryInterface.addIndex('dsg_bss_notification', ['client_id'], { name: 'idx_notification_client' });
        await queryInterface.addIndex('dsg_bss_notification', ['company_id'], { name: 'idx_notification_company' });
        await queryInterface.addIndex('dsg_bss_notification', ['notification_type'], { name: 'idx_notification_type' });
        await queryInterface.addIndex('dsg_bss_notification', ['delivery_status'], { name: 'idx_notification_status' });
        await queryInterface.addIndex('dsg_bss_notification', ['client_id', 'read_status'], { name: 'idx_notification_read' });
        await queryInterface.addIndex('dsg_bss_notification', ['scheduled_for'], { name: 'idx_notification_scheduled' });
        await queryInterface.addIndex('dsg_bss_notification', ['tenant_id'], { name: 'idx_notification_tenant' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_notification');
    }
};
