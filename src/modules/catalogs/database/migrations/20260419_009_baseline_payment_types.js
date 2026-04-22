/**
 * Baseline: crear tabla dsg_bss_payment_types
 * Catálogo de tipos de pago por país (tarjeta, transferencia, efectivo, etc.).
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_payment_types',
        module: 'catalogs'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_payment_types') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_payment_types ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_payment_types', {
            payment_type_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            country_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_country', key: 'country_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: { type: DataTypes.STRING(100), allowNull: false },
            code: { type: DataTypes.STRING(50), allowNull: false },
            category: {
                type: DataTypes.ENUM('tarjeta_credito', 'tarjeta_debito', 'transferencia_bancaria', 'billetera_digital', 'efectivo', 'criptomoneda'),
                allowNull: false
            },
            provider: { type: DataTypes.STRING(100), allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            icon_url: { type: DataTypes.STRING(255), allowNull: true },
            is_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            processing_time: { type: DataTypes.STRING(50), allowNull: true },
            commission_percentage: { type: DataTypes.DECIMAL(5, 4), defaultValue: 0.0000 },
            fixed_commission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
            min_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
            max_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
            api_config: { type: DataTypes.JSON, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: true }
        });

        await queryInterface.addIndex('dsg_bss_payment_types', ['country_id', 'code'], { unique: true, name: 'unique_payment_type_por_country' });
        await queryInterface.addIndex('dsg_bss_payment_types', ['category'], { name: 'idx_category_payment_type' });
        await queryInterface.addIndex('dsg_bss_payment_types', ['is_enabled'], { name: 'idx_is_enabled_payment_type' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_payment_types');
    }
};
