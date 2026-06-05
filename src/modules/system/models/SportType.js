/**
 * Modelo SportType - Catálogo de tipos de deportes
 * 
 * Este modelo almacena los diferentes tipos de deportes
 * disponibles en el sistema. Es una tabla de catálogo
 * que se utiliza para clasificar los espacios deportivos.
 * 
 * Relaciones:
 * - Tiene muchos Space (espacios deportivos)
 */

// Tiene migracion is_active 001_active_sport.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const SportType = sequelize.define('SportType', {
    sport_type_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del tipo de deporte'
    },
    code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'Código único del tipo de deporte'
    },
    name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Nombre del tipo de deporte'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'dsg_bss_sport_type',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de tipos de deportes',
    indexes: [
        {
            unique: true,
            fields: ['code']
        }
    ]
});

SportType.associate = function (models) {
    // Asociación con Space (un tipo de deporte puede tener múltiples espacios)
    SportType.hasMany(models.Space, {
        foreignKey: 'sport_type_id',
        as: 'spaces',
        onDelete: 'CASCADE'
    });
};

module.exports = SportType;