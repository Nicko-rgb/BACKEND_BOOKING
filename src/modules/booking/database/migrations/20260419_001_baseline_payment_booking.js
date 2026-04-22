/**
 * Baseline: crear tabla dsg_bss_payment_booking
 * Pagos asociados a reservas con soporte multi-gateway.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_payment_booking',
        module: 'booking'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_payment_booking') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_payment_booking ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_payment_booking', {
            payment_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            payment_type_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
            method: {
                type: DataTypes.ENUM('ONLINE', 'IN_PERSON'),
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM('PENDING', 'AWAITING_APPROVAL', 'PAID', 'FAILED', 'CANCELED', 'REFUNDED'),
                allowNull: false,
                defaultValue: 'PENDING'
            },
            payment_reference: { type: DataTypes.STRING(255), allowNull: true },
            transaction_id: { type: DataTypes.STRING(255), allowNull: true },
            comision_aplicada: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
            moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'PEN' },
            payment_date: { type: DataTypes.DATE, allowNull: true },
            payment_gateway: { type: DataTypes.STRING(50), allowNull: true },
            gateway_response: { type: DataTypes.JSONB, allowNull: true },
            scheduled_payment_date: { type: DataTypes.DATEONLY, allowNull: true },
            scheduled_payment_time: { type: DataTypes.STRING(30), allowNull: true },
            contact_phone: { type: DataTypes.STRING(20), allowNull: true },
            payment_proof_url: { type: DataTypes.STRING(500), allowNull: true },
            payment_proof_number: { type: DataTypes.STRING(50), allowNull: true },
            cash_received_at: { type: DataTypes.DATE, allowNull: true },
            cash_received_by: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            cash_receipt_number: { type: DataTypes.STRING(50), allowNull: true },
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

        await queryInterface.addIndex('dsg_bss_payment_booking', ['payment_type_id'], { name: 'idx_payment_type' });
        await queryInterface.addIndex('dsg_bss_payment_booking', ['status'], { name: 'idx_payment_status' });
        await queryInterface.addIndex('dsg_bss_payment_booking', ['payment_date'], { name: 'idx_payment_date' });
        await queryInterface.addIndex('dsg_bss_payment_booking', ['tenant_id'], { name: 'idx_payment_tenant' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_payment_booking');
    }
};
