const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Province = sequelize.define('Province', {
    dept_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        references: {
            model: 'dsg_bss_department',
            key: 'dept_code'
        },
        comment: 'Código del departamento al que pertenece la provincia'
    },
    prov_code: {
        type: DataTypes.CHAR(10),
        primaryKey: true,
        allowNull: false,
        comment: 'Código único de la provincia'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre de la provincia'
    },
    ubigeo4: {
        type: DataTypes.CHAR(20),
        allowNull: true,
        comment: 'Código ubigeo generado automáticamente (dept_code + prov_code)'
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
    tableName: 'dsg_bss_province',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla de provincias por departamento'
});

// Definir asociaciones
Province.associate = function(models) {
    // Una provincia pertenece a un departamento
    Province.belongsTo(models.Department, {
        foreignKey: 'dept_code',
        targetKey: 'dept_code',
        as: 'department'
    });
    
    // Una provincia tiene muchos distritos
    Province.hasMany(models.District, {
        foreignKey: ['dept_code', 'prov_code'],
        as: 'districts'
    });
};

module.exports = Province;