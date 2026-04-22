/**
 * Baseline: crear tabla dsg_bss_ratings
 * Calificaciones y reseñas de sucursales por usuarios.
 */
const { DataTypes } = require('sequelize');

module.exports = {
    meta: {
        description: 'Baseline: create dsg_bss_ratings',
        module: 'facility'
    },

    async up(queryInterface, sequelize) {
        const [rows] = await sequelize.query(
            `SELECT to_regclass('public.dsg_bss_ratings') IS NOT NULL AS exists`
        );
        if (rows[0].exists) {
            console.log('    ⏭️  dsg_bss_ratings ya existe — baseline registrado');
            return;
        }

        await queryInterface.createTable('dsg_bss_ratings', {
            rating_id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
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
            booking_id: { type: DataTypes.BIGINT, allowNull: true },
            score: { type: DataTypes.INTEGER, allowNull: false },
            title: { type: DataTypes.STRING(200), allowNull: true },
            comment: { type: DataTypes.TEXT, allowNull: true },
            pros: { type: DataTypes.TEXT, allowNull: true },
            cons: { type: DataTypes.TEXT, allowNull: true },
            would_recommend: { type: DataTypes.BOOLEAN, allowNull: true },
            status: {
                type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada', 'reportada'),
                defaultValue: 'pendiente'
            },
            moderated_by: {
                type: DataTypes.BIGINT,
                allowNull: true,
                references: { model: 'dsg_bss_user', key: 'user_id' },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            moderated_at: { type: DataTypes.DATE, allowNull: true },
            rated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
            updated_at: { type: DataTypes.DATE, allowNull: true }
        });

        await queryInterface.addIndex('dsg_bss_ratings', ['sucursal_id', 'status'], { name: 'idx_rating_sucursal_status' });
        await queryInterface.addIndex('dsg_bss_ratings', ['user_id'], { name: 'idx_rating_user_id' });
        await queryInterface.addIndex('dsg_bss_ratings', ['booking_id'], { name: 'idx_rating_booking_id' });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('dsg_bss_ratings');
    }
};
