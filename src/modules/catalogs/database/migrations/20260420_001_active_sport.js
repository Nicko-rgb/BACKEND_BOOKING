/**
 * Migración: active_sport
 * Módulo: catalogs
 * Creada: 2026-04-20T04:01:30.387Z
 */

const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Añade campo flag de habilitacion de deporte',
        module: 'catalogs'
    },

    /**
     * Aplicar migración
     * @param {import('sequelize').QueryInterface} queryInterface
     * @param {import('sequelize').Sequelize} sequelize
     * @param {import('sequelize').Transaction} transaction
     */
    async up(queryInterface, sequelize, transaction) {
        await queryInterface.addColumn(
            'dsg_bss_sport_type',
            'is_active',
            {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            { transaction }
        );
    },

    /**
     * Revertir migración
     * @param {import('sequelize').QueryInterface} queryInterface
     * @param {import('sequelize').Sequelize} sequelize
     * @param {import('sequelize').Transaction} transaction
     */
    async down(queryInterface, sequelize, transaction) {
        await queryInterface.removeColumn('dsg_bss_sport_category', 'is_active', { transaction });
        await queryInterface.removeColumn('dsg_bss_sport_type', 'is_active', { transaction });
    }
};
