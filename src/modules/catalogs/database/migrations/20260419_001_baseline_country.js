/**
 * Baseline: crear tabla dsg_bss_country
 * Catálogo de países con moneda, zona horaria e idioma.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_country',
        module: 'catalogs'
    },

    async up(queryInterface, sequelize) {
        // Verificar si la tabla ya existe (seguro para producción) ────────────
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_country') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_country ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_country', {
            country_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true
            },
            country: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            iso_country: {
                type: DataTypes.STRING(3),
                allowNull: false
            },
            phone_code: {
                type: DataTypes.STRING(10),
                allowNull: false
            },
            iso_currency: {
                type: DataTypes.STRING(3),
                allowNull: false
            },
            currency: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            currency_simbol: {
                type: DataTypes.STRING(5),
                allowNull: false
            },
            time_zone: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            language: {
                type: DataTypes.STRING(10),
                allowNull: false
            },
            date_format: {
                type: DataTypes.STRING(20),
                allowNull: false
            },
            flag_url: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            user_create: {
                type: DataTypes.BIGINT,
                allowNull: false
            },
            user_update: {
                type: DataTypes.BIGINT,
                allowNull: true
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: true
            }
        });

        // Índices ─────────────────────────────────────────────────────────────
        await queryInterface.addIndex('dsg_bss_country', ['iso_country'], { unique: true, name: 'idx_country_iso_unique' });
        await queryInterface.addIndex('dsg_bss_country', ['language'], { name: 'idx_country_language' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_country');
    }
};
