/**
 * Baseline: crear tabla dsg_bss_person
 * Datos personales extendidos de un usuario.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_person',
        module: 'users'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_person') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_person ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_person', {
            persona_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            user_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            country_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_country', key: 'country_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            date_birth: { type: DataTypes.DATEONLY, allowNull: true },
            gender: {
                type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'),
                allowNull: true
            },
            document_type: {
                type: DataTypes.ENUM('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'),
                allowNull: true
            },
            document_number: { type: DataTypes.STRING(50), allowNull: true },
            phone: { type: DataTypes.STRING(20), allowNull: true },
            address: { type: DataTypes.TEXT, allowNull: true },
            occupation: { type: DataTypes.STRING(100), allowNull: true },
            civil_state: {
                type: DataTypes.ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON-LAW'),
                allowNull: true
            },
            sports_preferences: { type: DataTypes.JSON, allowNull: true },
            accept_marketing: { type: DataTypes.BOOLEAN, defaultValue: false },
            created_at: { type: DataTypes.DATE, allowNull: true },
            updated_at: { type: DataTypes.DATE, allowNull: true }
        });

        await queryInterface.addIndex('dsg_bss_person', ['user_id'], { unique: true, name: 'idx_person_user_id_unique' });
        await queryInterface.addIndex('dsg_bss_person', ['document_number'], { name: 'idx_person_document_number' });
        await queryInterface.addIndex('dsg_bss_person', ['country_id'], { name: 'idx_person_country_id' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_person');
    }
};
