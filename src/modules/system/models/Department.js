const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

// Definir el modelo Department primero
const Department = sequelize.define('Department', {
    dept_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código único del departamento'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_country',
            key: 'country_id'
        },
        comment: 'ID del país al que pertenece el departamento'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del departamento'
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
    tableName: 'dsg_bss_department',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla de departamentos/estados por país'
});

// Definir asociaciones
Department.associate = function(models) {
    // Un departamento pertenece a un país
    Department.belongsTo(models.Country, {
        foreignKey: 'country_id',
        as: 'country'
    });
    
    // Un departamento tiene muchas provincias
    Department.hasMany(models.Province, {
        foreignKey: 'dept_code',
        sourceKey: 'dept_code',
        as: 'provinces'
    });
};

module.exports = Department;