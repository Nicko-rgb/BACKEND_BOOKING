/**
 * Baseline: crear tabla dsg_bss_media
 * Almacenamiento polimórfico de archivos multimedia.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_media',
        module: 'media'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_media') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_media ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_media', {
            media_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            medible_id: { type: DataTypes.BIGINT, allowNull: false },
            medible_type: { type: DataTypes.STRING(50), allowNull: false },
            tenant_id: { type: DataTypes.STRING(36), allowNull: false },
            type: {
                type: DataTypes.ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'),
                defaultValue: 'IMAGE'
            },
            category: {
                type: DataTypes.ENUM('GALLERY', 'PROFILE', 'COVER', 'THUMBNAIL', 'DOCUMENT'),
                defaultValue: 'GALLERY'
            },
            file_url: { type: DataTypes.STRING(500), allowNull: false },
            file_name: { type: DataTypes.STRING(255), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
            user_create: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            user_update: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            created_at: { type: DataTypes.DATE, allowNull: true },
            updated_at: { type: DataTypes.DATE, allowNull: true }
        });

        await queryInterface.addIndex('dsg_bss_media', ['tenant_id'], { name: 'idx_media_tenant' });
        await queryInterface.addIndex('dsg_bss_media', ['medible_id', 'medible_type'], { name: 'idx_media_polymorphic' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_media');
    }
};
