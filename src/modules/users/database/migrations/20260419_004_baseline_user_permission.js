/**
 * Baseline: crear tabla dsg_bss_user_permissions
 * Permisos asignados a usuarios individuales.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_user_permissions',
        module: 'users'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_user_permissions') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_user_permissions ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_user_permissions', {
            user_permission_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            permission_key: { type: DataTypes.STRING(100), allowNull: false },
            granted_by: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_user_permissions', ['user_id', 'permission_key'], { unique: true, name: 'unique_user_permission' });
        await queryInterface.addIndex('dsg_bss_user_permissions', ['user_id'], { name: 'idx_user_permission_user' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_user_permissions');
    }
};
