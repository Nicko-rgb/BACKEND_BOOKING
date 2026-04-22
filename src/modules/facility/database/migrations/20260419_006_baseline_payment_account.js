/**
 * Baseline: crear tabla dsg_bss_payment_account
 * Cuentas de pago (bancarias, billeteras digitales) por sucursal.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_payment_account',
        module: 'facility'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_payment_account') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_payment_account ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_payment_account', {
            payment_account_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
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
            configuration_payment_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_configuration_payment', key: 'configuration_payment_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            account_alias: { type: DataTypes.STRING(150), allowNull: true },
            account_number: { type: DataTypes.STRING(50), allowNull: true },
            account_name: { type: DataTypes.STRING(200), allowNull: true },
            qr_url: { type: DataTypes.STRING(500), allowNull: true },
            bank_name: { type: DataTypes.STRING(100), allowNull: true },
            bank_account_type: {
                type: DataTypes.ENUM('AHORROS', 'CORRIENTE'),
                allowNull: true
            },
            bank_account_cci: { type: DataTypes.STRING(30), allowNull: true },
            bank_currency: { type: DataTypes.STRING(3), defaultValue: 'PEN' },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
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

        await queryInterface.addIndex('dsg_bss_payment_account', ['sucursal_id'], { name: 'idx_payment_account_sucursal' });
        await queryInterface.addIndex('dsg_bss_payment_account', ['sucursal_id', 'payment_type_id'], { name: 'idx_payment_account_sucursal_type' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_payment_account');
    }
};
