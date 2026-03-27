const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const District = sequelize.define('District', {
    dept_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código del departamento'
    },
    prov_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código de la provincia'
    },
    dist_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código único del distrito'
    },
    name: {
        type: DataTypes.STRING(120),
        allowNull: false,
        comment: 'Nombre del distrito'
    },
    ubigeo6: {
        type: DataTypes.CHAR(30),
        allowNull: true,
        comment: 'Código ubigeo generado automáticamente (dept_code + prov_code + dist_code)'
    }
}, {
    tableName: 'dsg_bss_district',
    timestamps: false,
    comment: 'Tabla de distritos por provincia'
});

// Definir asociaciones
District.associate = function(models) {
    // Un distrito pertenece a una provincia
    District.belongsTo(models.Province, {
        foreignKey: ['dept_code', 'prov_code'],
        as: 'province'
    });
};

module.exports = District;