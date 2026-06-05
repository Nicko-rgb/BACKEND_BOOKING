/**
 * Baseline: crear tabla dsg_bss_district (legacy)
 * Tabla legada de distritos — reemplazada por dsg_bss_ubigeo.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_district (legacy)',
        module: 'catalogs'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_district') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_district ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_district', {
            dept_code: { type: DataTypes.CHAR(10), primaryKey: true },
            prov_code: { type: DataTypes.CHAR(10), primaryKey: true },
            dist_code: { type: DataTypes.CHAR(10), primaryKey: true },
            name: { type: DataTypes.STRING(120), allowNull: false },
            ubigeo6: { type: DataTypes.CHAR(30), allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_district');
    }
};
