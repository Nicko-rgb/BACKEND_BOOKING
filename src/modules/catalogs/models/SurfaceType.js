/**
 * Modelo SurfaceType - Catálogo de tipos de superficie
 * 
 * Este modelo almacena los diferentes tipos de superficies
 * disponibles para los espacios deportivos. Es una tabla de catálogo
 * que se utiliza para clasificar las características de los espacios.
 * 
 * Relaciones:
 * - Tiene muchos Space (espacios deportivos)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const SurfaceType = sequelize.define('SurfaceType', {
    surface_type_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del tipo de superficie'
    },
    code: {
        type: DataTypes.STRING(32),
        allowNull: false,
        comment: 'Código único del tipo de superficie'
    },
    name: {
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: 'Nombre del tipo de superficie'
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
    tableName: 'dsg_bss_surface_type',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Catálogo de tipos de superficie',
    indexes: [
        {
            unique: true,
            fields: ['code']
        }
    ]
});

SurfaceType.associate = function (models) {
    // Asociación con Space (un tipo de superficie puede tener múltiples espacios)
    SurfaceType.hasMany(models.Space, {
        foreignKey: 'surface_type_id',
        as: 'spaces',
        onDelete: 'CASCADE'
    });
};

module.exports = SurfaceType;