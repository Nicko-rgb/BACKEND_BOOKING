/**
 * Baseline: crear tabla dsg_bss_booking
 * Reservas de espacios deportivos.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_booking',
        module: 'booking'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_booking') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_booking ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_booking', {
            booking_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            space_id: { type: DataTypes.BIGINT, allowNull: false },
            booking_date: { type: DataTypes.DATEONLY, allowNull: false },
            start_time: { type: DataTypes.TIME, allowNull: false },
            end_time: { type: DataTypes.TIME, allowNull: false },
            duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
            duration_hours: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
            status: {
                type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW', 'REJECTED'),
                defaultValue: 'PENDING'
            },
            payment_method: {
                type: DataTypes.ENUM('ONLINE', 'IN_PERSON'),
                allowNull: false
            },
            payment_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_payment_booking', key: 'payment_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
            discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
            notes: { type: DataTypes.TEXT, allowNull: true },
            cancellation_reason: { type: DataTypes.TEXT, allowNull: true },
            confirmed_at: { type: DataTypes.DATE, allowNull: true },
            approved_by: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            approved_at: { type: DataTypes.DATE, allowNull: true },
            created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: true }
        });

        await queryInterface.addIndex('dsg_bss_booking', ['space_id', 'booking_date', 'status'], { name: 'idx_booking_space_date_status' });
        await queryInterface.addIndex('dsg_bss_booking', ['space_id', 'booking_date', 'start_time', 'end_time'], { name: 'idx_booking_space_time_range' });
        await queryInterface.addIndex('dsg_bss_booking', ['user_id'], { name: 'idx_booking_user' });
        await queryInterface.addIndex('dsg_bss_booking', ['payment_id'], { name: 'idx_booking_payment' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_booking');
    }
};
