/**
 * Modelo UserCompany - Asignación contextual de usuarios a empresas/sucursales
 *
 * Vincula un usuario con una empresa o sucursal específica y su clasificador de rol.
 * El campo `role` es varchar — no es FK funcional. Los accesos se evalúan por user_permissions.
 *
 * Jerarquía:
 *   system        → sin restricción (no requiere registro aquí)
 *   super_admin   → asignado a la empresa principal (company con parent_company_id NULL)
 *   administrador → asignado a una sucursal específica
 *   empleado      → asignado a una sucursal específica
 *
 * Relaciones:
 * - Pertenece a un User
 * - Pertenece a un Company (empresa o sucursal)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const UserCompany = sequelize.define('UserCompany', {
    user_company_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        comment: 'Identificador único de la asignación usuario-empresa'
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario asignado'
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_company',
            key: 'company_id'
        },
        comment: 'Empresa o sucursal a la que pertenece el usuario'
    },
    // Clasificador de rol en este contexto (no FK — no controla accesos, solo display).
    // Valores: 'super_admin', 'administrador', 'empleado'
    role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Clasificador del rol del usuario en esta empresa/sucursal (solo display)'
    },
    tenant_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        comment: 'tenant_id de la empresa raíz, para filtrado rápido por tenant'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica si la asignación está activa'
    },
    created_by: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'dsg_bss_user',
            key: 'user_id'
        },
        comment: 'Usuario que realizó la asignación'
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
    tableName: 'dsg_bss_user_company',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        // Un usuario solo puede tener una asignación por empresa/sucursal ──────────────
        {
            unique: true,
            fields: ['user_id', 'company_id'],
            name: 'unique_user_company'
        },
        {
            fields: ['user_id'],
            name: 'idx_user_company_user'
        },
        {
            fields: ['company_id'],
            name: 'idx_user_company_company'
        },
        {
            fields: ['tenant_id'],
            name: 'idx_user_company_tenant'
        }
    ],
    comment: 'Asignación de usuarios a empresas/sucursales con su rol contextual'
});

UserCompany.associate = function (models) {
    UserCompany.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
    });

    UserCompany.belongsTo(models.Company, {
        foreignKey: 'company_id',
        as: 'company'
    });
};

module.exports = UserCompany;
