/**
 * Baseline: crear tabla dsg_bss_space
 * Espacios deportivos (canchas, pistas) de una sucursal.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_space',
        module: 'facility'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_space') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_space ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_space', {
            space_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            sucursal_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            name: { type: DataTypes.STRING(100), allowNull: false },
            surface_type_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_surface_type', key: 'surface_type_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            sport_type_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_sport_type', key: 'sport_type_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            sport_category_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_sport_category', key: 'sport_category_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            status_space: {
                type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
                allowNull: false
            },
            description: { type: DataTypes.TEXT, allowNull: true },
            capacity: { type: DataTypes.INTEGER, allowNull: true },
            dimensions: { type: DataTypes.STRING(100), allowNull: false },
            equipment: { type: DataTypes.TEXT, allowNull: true },
            minimum_booking_minutes: { type: DataTypes.INTEGER, defaultValue: 60 },
            maximum_booking_minutes: { type: DataTypes.INTEGER, defaultValue: 480 },
            booking_buffer_minutes: { type: DataTypes.INTEGER, defaultValue: 15 },
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

        await queryInterface.addIndex('dsg_bss_space', ['sucursal_id'], { name: 'idx_space_sucursal' });
        await queryInterface.addIndex('dsg_bss_space', ['surface_type_id'], { name: 'idx_space_surface_type' });
        await queryInterface.addIndex('dsg_bss_space', ['sport_category_id'], { name: 'idx_space_sport_category' });
        await queryInterface.addIndex('dsg_bss_space', ['sport_type_id'], { name: 'idx_space_sport_type' });
        await queryInterface.addIndex('dsg_bss_space', ['tenant_id'], { name: 'idx_space_tenant' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_space');
    }
};
