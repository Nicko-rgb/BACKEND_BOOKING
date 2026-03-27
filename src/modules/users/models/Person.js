/**
 * Modelo Persona - Información personal detallada de usuarios
 * 
 * Este modelo almacena datos personales específicos de los usuarios como
 * fecha de nacimiento, género, documento de identidad, dirección completa,
 * y otros datos demográficos importantes para el sistema de reservas deportivas.
 * 
 * Relaciones:
 * - Pertenece a un Country (país de residencia)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Person = sequelize.define('Person', {
    persona_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'ID del usuario dueño de estos datos personales'
    },
    country_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_country',
            key: 'country_id'
        },
        comment: 'ID del país al que pertenece la persona'
    },
    date_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Fecha de nacimiento'
    },
    gender: {
        type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER', 'NOT_SPECIFIED'),
        allowNull: true,
        comment: 'Género de la persona'
    },
    document_type: {
        type: DataTypes.ENUM('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER'),
        allowNull: true,
        comment: 'Tipo de documento de identidad'
    },
    document_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Número del documento de identidad'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Número de teléfono del usuario'
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Dirección completa de residencia'
    },
    occupation: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Ocupación o profesión'
    },
    civil_state: {
        type: DataTypes.ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON-LAW'),
        allowNull: true,
        comment: 'Estado civil'
    },
    sports_preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Deportes o actividades de preferencia'
    },
    accept_marketing: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Acepta recibir comunicaciones de marketing'
    },
}, {
    tableName: 'dsg_bss_person',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tabla que almacena información personal detallada de los usuarios',
    indexes: [
        // Índice único: un registro de persona por usuario ────────────────────────────
        {
            name: 'idx_person_user_id_unique',
            unique: true,
            fields: ['user_id']
        },
        // Índice para buscar persona por número de documento ──────────────────────────
        {
            name: 'idx_person_document_number',
            fields: ['document_number']
        },
        // Índice para filtrar personas por país ────────────────────────────────────────
        {
            name: 'idx_person_country_id',
            fields: ['country_id']
        }
    ]
});

// Definir asociaciones
Person.associate = function (models) {
    // Una persona pertenece a un país
    Person.belongsTo(models.Country, {
        foreignKey: 'country_id',
        as: 'country'
    });

    // Una persona pertenece a un usuario
    Person.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
};

module.exports = Person;
