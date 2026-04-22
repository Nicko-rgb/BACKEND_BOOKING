/**
 * Baseline: crear tabla dsg_bss_department (legacy)
 * Tabla legada de departamentos — reemplazada por dsg_bss_ubigeo.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_department (legacy)',
        module: 'catalogs'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_department') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_department ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_department', {
            dept_code: { type: DataTypes.CHAR(10), primaryKey: true },
            country_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_country', key: 'country_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            name: { type: DataTypes.STRING(100), allowNull: false },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_department');
    }
};
