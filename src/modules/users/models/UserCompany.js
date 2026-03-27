/**
 * Modelo UserCompany - Asignación contextual de usuarios a empresas/sucursales
 *
 * Vincula un usuario con una empresa o sucursal específica y su rol dentro de ella.
 * Esto permite el aislamiento de datos por tenant: un super_admin solo ve sus empresas,
 * un administrador solo ve su sucursal asignada, un empleado ídem.
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
 * - Pertenece a un Role
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
    role_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'dsg_bss_roles',
            key: 'role_id'
        },
        comment: 'Rol del usuario dentro de esta empresa/sucursal'
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
        {
            unique: true,
            fields: ['user_id', 'company_id', 'role_id'],
            name: 'unique_user_company_role'
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

    UserCompany.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role'
    });
};

module.exports = UserCompany;
