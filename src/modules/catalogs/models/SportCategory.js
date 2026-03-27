/**
 * Modelo SportCategory - Catálogo de categorías deportivas
 * 
 * Este modelo almacena las diferentes categorías deportivas
 * disponibles en el sistema. Es una tabla de catálogo
 * que se utiliza para clasificar los espacios deportivos.
 * 
 * Relaciones:
 * - Tiene muchos Space (espacios deportivos)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const SportCategory = sequelize.define('SportCategory', {
    sport_category_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la categoría deportiva'
    },
    code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'Código único de la categoría deportiva'
    },
    name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Nombre de la categoría deportiva'
    }
}, {
    tableName: 'dsg_bss_sport_category',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
    comment: 'Catálogo de categorías deportivas',
    indexes: [
        {
            unique: true,
            fields: ['code']
        }
    ]
});

SportCategory.associate = function (models) {

    // Asociación con Space (una categoría puede tener múltiples espacios)
    SportCategory.hasMany(models.Space, {
        foreignKey: 'sport_category_id',
        as: 'spaces',
        onDelete: 'CASCADE'
    });
};

module.exports = SportCategory;