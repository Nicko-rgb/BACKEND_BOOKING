/**
 * Baseline: crear tabla dsg_bss_menu_items
 * Ítems del menú dinámico de la aplicación.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_menu_items',
        module: 'catalogs'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_menu_items') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_menu_items ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_menu_items', {
            menu_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
            label: { type: DataTypes.STRING(100), allowNull: false },
            icon: { type: DataTypes.STRING(80), allowNull: true },
            path: { type: DataTypes.STRING(200), allowNull: true },
            parent_key: { type: DataTypes.STRING(50), allowNull: true },
            required_permission: { type: DataTypes.STRING(100), allowNull: true },
            app_access: {
                type: DataTypes.ENUM('admin', 'booking', 'both'),
                allowNull: false,
                defaultValue: 'admin'
            },
            group_title: { type: DataTypes.STRING(50), allowNull: true },
            sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_menu_items', ['app_access', 'is_active'], { name: 'idx_menu_app_active' });
        await queryInterface.addIndex('dsg_bss_menu_items', ['group_title', 'sort_order'], { name: 'idx_menu_group_order' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_menu_items');
    }
};
