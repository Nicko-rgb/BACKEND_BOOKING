/**
 * Modelo Media - Gestión de archivos multimedia
 * 
 * Este modelo almacena información de los archivos multimedia
 * (imágenes, videos) asociados a compañías y espacios deportivos.
 * Permite categorizar los medios y marcar imágenes principales.
 * 
 * Relaciones:
 * - Pertenece a una Company (compañía propietaria)
 * - Pertenece a un Space (espacio deportivo)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Media = sequelize.define('Media', {
    media_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único del archivo multimedia'
    },
    // Campos Polimórficos
    medible_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del modelo relacionado (Company, Space, User, etc.)'
    },
    medible_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Tipo del modelo relacionado (nombre de la tabla o modelo)'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },
    type: {
        type: DataTypes.ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'),
        defaultValue: 'IMAGE',
        comment: 'Tipo de archivo multimedia'
    },
    category: {
        type: DataTypes.ENUM('GALLERY', 'PROFILE', 'COVER', 'THUMBNAIL', 'DOCUMENT'),
        defaultValue: 'GALLERY',
        comment: 'Categoría del archivo multimedia'
    },
    file_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'URL del archivo multimedia'
    },
    file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nombre del archivo'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descripción del archivo multimedia'
    },
    is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Indica si es la imagen principal'
    },
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que creó el registro'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que actualizó el registro'
    }
}, {
    tableName: 'dsg_bss_media',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Tabla de archivos multimedia',
    indexes: [
        {
            name: 'idx_media_tenant',
            fields: ['tenant_id']
        },
        {
            name: 'idx_media_polymorphic',
            fields: ['medible_id', 'medible_type']
        }
    ]
});

// Definir asociaciones
Media.associate = function (models) {
    
    // Asociación Polimórfica: Media puede pertenecer a cualquier modelo
    Media.belongsTo(models.Company, {
        foreignKey: 'medible_id',
        constraints: false,
        as: 'company'
    });

    Media.belongsTo(models.Space, {
        foreignKey: 'medible_id',
        constraints: false,
        as: 'space'
    });

    // Relación polimórfica: el usuario al que pertenece el medio (ej: foto de perfil)
    Media.belongsTo(models.User, {
        foreignKey: 'medible_id',
        constraints: false,
        as: 'medibleUser'
    });

    // Relación con el usuario que creó el registro
    Media.belongsTo(models.User, {
        foreignKey: 'user_create',
        as: 'creator'
    });

    // Relación con el usuario que actualizó el registro
    Media.belongsTo(models.User, {
        foreignKey: 'user_update',
        as: 'updater'
    });

    // Aquí puedes agregar más asociaciones a medida que las necesites (User, etc.)
};

module.exports = Media;
