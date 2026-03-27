/**
 * Modelo MenuItem — Ítems del menú de navegación (dinámico)
 *
 * Permite que el menú de AppAdmin se cargue desde la base de datos,
 * filtrando automáticamente los ítems según los permisos del usuario logueado.
 *
 * Relaciones: ninguna (tabla de configuración independiente)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/db');

const MenuItem = sequelize.define('MenuItem', {
    menu_id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Identificador único del ítem (ej: dashboard, bookings)',
    },
    label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Texto visible en la UI',
    },
    icon: {
        type: DataTypes.STRING(80),
        allowNull: true,
        comment: 'Nombre del ícono (Lucide o react-icons)',
    },
    path: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Ruta del router (ej: /bookings)',
    },
    parent_key: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Clave del ítem padre (NULL = menú raíz)',
    },
    required_permission: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Permiso necesario para ver este ítem (NULL = solo requiere estar logueado)',
    },
    app_access: {
        type: DataTypes.ENUM('admin', 'booking', 'both'),
        allowNull: false,
        defaultValue: 'admin',
    },
    group_title: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Grupo de sección en el sidebar (GENERAL, SUPPORT, CONFIG)',
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de aparición dentro del grupo',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'dsg_bss_menu_items',
    timestamps: false,
    indexes: [
        {
            fields: ['app_access', 'is_active'],
            name: 'idx_menu_app_active',
        },
        {
            fields: ['group_title', 'sort_order'],
            name: 'idx_menu_group_order',
        },
    ],
    comment: 'Ítems de menú dinámico para el panel de administración',
});

// Sin asociaciones — tabla de configuración independiente
MenuItem.associate = function () {};

module.exports = MenuItem;
