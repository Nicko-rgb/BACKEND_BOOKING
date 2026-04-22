/**
 * Baseline: crear tabla dsg_bss_booking_hold
 * Reservas temporales (holds) que bloquean un horario mientras el usuario paga.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_booking_hold',
        module: 'booking'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_booking_hold') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_booking_hold ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_booking_hold', {
            hold_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            space_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_space', key: 'space_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            booking_date: { type: DataTypes.DATEONLY, allowNull: false },
            start_time: { type: DataTypes.TIME, allowNull: false },
            end_time: { type: DataTypes.TIME, allowNull: false },
            expires_at: { type: DataTypes.DATE, allowNull: false },
            extension_count: { type: DataTypes.INTEGER, defaultValue: 0 },
            extension_limit: { type: DataTypes.INTEGER, defaultValue: 1 },
            status: {
                type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED'),
                defaultValue: 'ACTIVE'
            },
            created_at: { type: DataTypes.DATE, allowNull: true },
            updated_at: { type: DataTypes.DATE, allowNull: true }
        });

        await queryInterface.addIndex('dsg_bss_booking_hold', ['space_id', 'booking_date', 'status'], { name: 'idx_hold_space_date_status' });
        await queryInterface.addIndex('dsg_bss_booking_hold', ['status', 'expires_at'], { name: 'idx_hold_expires_status' });
        await queryInterface.addIndex('dsg_bss_booking_hold', ['user_id', 'status'], { name: 'idx_hold_user_status' });
        await queryInterface.addIndex('dsg_bss_booking_hold', ['space_id', 'booking_date', 'start_time', 'end_time', 'status'], {
            unique: true,
            name: 'idx_hold_unique_active_slot',
            where: { status: 'ACTIVE' }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_booking_hold');
    }
};
