/**
 * Modelo UserFavorite - Gestión de instalaciones favoritas por usuario
 * 
 * Este modelo permite a los usuarios marcar instalaciones deportivas (sucursales)
 * como favoritas para un acceso rápido y seguimiento.
 * 
 * Relaciones:
 * - Pertenece a un User (el usuario que marca como favorito)
 * - Pertenece a una Company (la sucursal marcada como favorita)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const UserFavorite = sequelize.define('UserFavorite', {
    favorite_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del favorito'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'ID del usuario que marca como favorito'
    },
    sucursal_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        },
        comment: 'ID de la instalación (sucursal) marcada como favorita'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha en que se añadió a favoritos'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Fecha de última actualización'
    }
}, {
    tableName: 'dsg_bss_user_favorites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'sucursal_id'],
            name: 'unique_user_sucursal_favorite'
        }
    ]
});

// Definir asociaciones
UserFavorite.associate = function (models) {
    // Pertenece a un usuario
    UserFavorite.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    // Pertenece a una instalación (sucursal/empresa)
    UserFavorite.belongsTo(models.Company, {
        foreignKey: 'sucursal_id',
        as: 'sucursal'
    });
};

module.exports = UserFavorite;
