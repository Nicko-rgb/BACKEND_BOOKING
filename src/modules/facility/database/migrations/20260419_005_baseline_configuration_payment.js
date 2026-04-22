/**
 * Baseline: crear tabla dsg_bss_configuration_payment
 * Métodos de pago habilitados por sucursal.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_configuration_payment',
        module: 'facility'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_configuration_payment') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_configuration_payment ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_configuration_payment', {
            configuration_payment_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            sucursal_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            payment_type_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_payment_types', key: 'payment_type_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            sort_order: { type: DataTypes.INTEGER, allowNull: true },
            is_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

        await queryInterface.addIndex('dsg_bss_configuration_payment', ['sucursal_id', 'payment_type_id'], { unique: true, name: 'unique_configuration_payment' });
        await queryInterface.addIndex('dsg_bss_configuration_payment', ['sucursal_id'], { name: 'idx_configuration_payment_company' });
        await queryInterface.addIndex('dsg_bss_configuration_payment', ['payment_type_id'], { name: 'idx_configuration_payment_type' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_configuration_payment');
    }
};
