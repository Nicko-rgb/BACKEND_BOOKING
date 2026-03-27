/**
 * Modelo Configuration - Configuración de compañías Y sucursales
 *
 * Un mismo modelo para ambos tipos de entidad ya que Company y Sucursal
 * comparten la tabla dsg_bss_company (self-referencing via parent_company_id).
 * La FK company_id tiene unique:true → una config por entidad.
 *
 * Campos agrupados por sección:
 *  - Redes Sociales:        social_*
 *  - Configuración Visual:  theme_*, logo_url, etc.  (futuro)
 *
 * Nota: Los datos de pago (Yape, Plin, cuentas bancarias) se gestionan
 * en la tabla dsg_bss_payment_account (modelo PaymentAccount).
 *
 * Relaciones:
 * - Pertenece a una Company (puede ser empresa o sucursal)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const Configuration = sequelize.define('Configuration', {
    config_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la configuración'
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        },
        comment: 'Referencia a la compañía o sucursal configurada'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'Identificador del tenant para multi-tenancy'
    },

    // ── Redes sociales y contacto público ───────────────────────────────────
    social_facebook: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace a la página de Facebook'
    },
    social_instagram: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace al perfil de Instagram'
    },
    social_tiktok: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace al perfil de TikTok'
    },
    social_youtube: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Enlace al canal de YouTube'
    },
    social_whatsapp: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Número de WhatsApp de la sucursal (solo dígitos, ej: 51987654321)'
    },
    whatsapp_message: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Mensaje predefinido para el botón de WhatsApp'
    },

    // ── Auditoría ────────────────────────────────────────────────────────────
    user_create: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que creó la configuración'
    },
    user_update: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que actualizó la configuración'
    }
}, {
    tableName: 'dsg_bss_configuration',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true,
    comment: 'Tabla de configuración de compañías y sucursales'
});

// Definir asociaciones
Configuration.associate = function (models) {
    // Pertenece a una compañía
    Configuration.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
    });

    // Pertenece a un usuario (creador)
    Configuration.belongsTo(models.User, {
        foreignKey: 'user_create',
        as: 'userCreate'
    });

    // Pertenece a un usuario (actualizador)
    Configuration.belongsTo(models.User, {
        foreignKey: 'user_update',
        as: 'userUpdate'
    });
};

module.exports = Configuration;
