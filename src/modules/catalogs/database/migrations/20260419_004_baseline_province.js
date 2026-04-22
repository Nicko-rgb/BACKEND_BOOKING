/**
 * Baseline: crear tabla dsg_bss_province (legacy)
 * Tabla legada de provincias — reemplazada por dsg_bss_ubigeo.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_province (legacy)',
        module: 'catalogs'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_province') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_province ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_province', {
            dept_code: {
                type: DataTypes.CHAR(10),
                primaryKey: true,
                references: { model: 'dsg_bss_department', key: 'dept_code' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            prov_code: { type: DataTypes.CHAR(10), primaryKey: true },
            name: { type: DataTypes.STRING(100), allowNull: false },
            ubigeo4: { type: DataTypes.CHAR(20), allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_province');
    }
};
