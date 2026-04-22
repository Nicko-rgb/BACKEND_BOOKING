/**
 * Baseline: crear tabla dsg_bss_company
 * Empresas y sucursales con estructura jerárquica (empresa → sucursales).
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_company',
        module: 'facility'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_company') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_company ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_company', {
            company_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            country_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_country', key: 'country_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            name: { type: DataTypes.STRING(200), allowNull: false },
            address: { type: DataTypes.TEXT, allowNull: false },
            ubigeo_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_ubigeo', key: 'ubigeo_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            phone_cell: { type: DataTypes.STRING(20), allowNull: false },
            phone: { type: DataTypes.STRING(20), allowNull: true },
            website: { type: DataTypes.STRING(255), allowNull: true },
            document: { type: DataTypes.STRING(20), allowNull: false },
            postal_code: { type: DataTypes.STRING(20), allowNull: true },
            latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
            longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
            status: {
                type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
                defaultValue: 'ACTIVE'
            },
            description: { type: DataTypes.TEXT, allowNull: true },
            parking_available: { type: DataTypes.BOOLEAN, defaultValue: false },
            opening_time: { type: DataTypes.TIME, allowNull: true },
            closing_time: { type: DataTypes.TIME, allowNull: true },
            min_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
            features: { type: DataTypes.TEXT, allowNull: true },
            parent_company_id: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            is_enabled: {
                type: DataTypes.ENUM('A', 'I'),
                allowNull: false
            },
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

        await queryInterface.addIndex('dsg_bss_company', ['tenant_id'], { name: 'idx_company_tenant_id' });
        await queryInterface.addIndex('dsg_bss_company', ['country_id'], { name: 'idx_company_country_id' });
        await queryInterface.addIndex('dsg_bss_company', ['ubigeo_id'], { name: 'idx_company_ubigeo_id' });
        await queryInterface.addIndex('dsg_bss_company', ['parent_company_id'], { name: 'idx_company_parent_company_id' });
        await queryInterface.addIndex('dsg_bss_company', ['status', 'is_enabled'], { name: 'idx_company_status_enabled' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_company');
    }
};
