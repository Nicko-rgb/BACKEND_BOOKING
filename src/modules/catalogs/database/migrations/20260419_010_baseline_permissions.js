/**
 * Baseline: crear tabla dsg_bss_permissions
 * Catálogo de permisos del sistema (modulo.accion).
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_permissions',
        module: 'catalogs'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_permissions') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_permissions ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_permissions', {
            permission_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
            label: { type: DataTypes.STRING(150), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            module: { type: DataTypes.STRING(50), allowNull: false },
            app_access: {
                type: DataTypes.ENUM('booking', 'admin', 'both'),
                allowNull: false,
                defaultValue: 'admin'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_permissions', ['module'], { name: 'idx_permission_module' });
        await queryInterface.addIndex('dsg_bss_permissions', ['app_access'], { name: 'idx_permission_app_access' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_permissions');
    }
};
