/**
 * Baseline: crear tabla dsg_bss_user_favorites
 * Sucursales marcadas como favoritas por el usuario.
 * Movida al módulo facility porque depende de dsg_bss_company.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_user_favorites',
        module: 'facility'
    },

    async up(queryInterface, sequelize) {
        // Seguro en producción: no crea si ya existe ──────────────────────────
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_user_favorites') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_user_favorites ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_user_favorites', {
            favorite_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            sucursal_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_company', key: 'company_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });

        await queryInterface.addIndex('dsg_bss_user_favorites', ['user_id', 'sucursal_id'], { unique: true, name: 'unique_user_sucursal_favorite' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_user_favorites');
    }
};
