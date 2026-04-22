const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

/**
 * Modelo Ubigeo — tabla geográfica unificada y autorreferenciada
 * Almacena niveles geográficos de cualquier país (dept/estado, provincia, distrito, etc.)
 * Nivel 1 = Departamento/Estado, Nivel 2 = Provincia, Nivel 3 = Distrito
 */
const Ubigeo = sequelize.define('Ubigeo', {
    ubigeo_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del registro geográfico'
    },
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Código geográfico: 2 dígitos dept, 4 dígitos prov, 6 dígitos dist'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nombre del nivel geográfico'
    },
    level: {
        type: DataTypes.SMALLINT,  // PostgreSQL no soporta TINYINT — usar SMALLINT ──
        allowNull: false,
        comment: '1=Departamento/Estado, 2=Provincia, 3=Distrito/Ciudad'
    },
    parent_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_ubigeo',
            key: 'ubigeo_id'
        },
        comment: 'Referencia al nivel geográfico padre (nulo para nivel 1)'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_country',
            key: 'country_id'
        },
        comment: 'País al que pertenece este registro geográfico'
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
    tableName: 'dsg_bss_ubigeo',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla geográfica unificada y autorreferenciada por niveles',
    indexes: [
        // Índice compuesto para filtrar por país y nivel (consulta principal de cascada) ──
        {
            name: 'idx_ubigeo_country_level',
            fields: ['country_id', 'level']
        },
        // Índice para cargar hijos de un nodo padre ────────────────────────────────────
        {
            name: 'idx_ubigeo_parent_id',
            fields: ['parent_id']
        },
        // Índice único por código geográfico (dept 2 dígitos, prov 4, dist 6) ──────────
        {
            name: 'idx_ubigeo_code',
            unique: true,
            fields: ['code']
        }
    ]
});

/** Asociaciones del modelo Ubigeo */
Ubigeo.associate = function(models) {
    // Pertenece a un país ────────────────────────────────────────────────────
    Ubigeo.belongsTo(models.Country, {
        foreignKey: 'country_id',
        as: 'country'
    });

    // Autorreferencia: pertenece a su padre (nivel superior) ─────────────────
    Ubigeo.belongsTo(models.Ubigeo, {
        foreignKey: 'parent_id',
        as: 'parent'
    });

    // Autorreferencia: tiene muchos hijos (nivel inferior) ────────────────────
    Ubigeo.hasMany(models.Ubigeo, {
        foreignKey: 'parent_id',
        as: 'children'
    });

    // Tiene muchas empresas/sucursales asignadas a este nivel geográfico ──────
    if (models.Company) {
        Ubigeo.hasMany(models.Company, {
            foreignKey: 'ubigeo_id',
            as: 'companies'
        });
    }
};

module.exports = Ubigeo;
