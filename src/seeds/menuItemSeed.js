const { MenuItem } = require('../modules/catalogs/models');

/**
 * Ítems del menú de navegación para el panel de administración.
 * El campo required_permission controla qué usuarios pueden ver cada ítem.
 * NULL = visible para cualquier usuario admin autenticado.
 */
const MENU_ITEMS = [
    // ── Grupo: GENERAL ────────────────────────────────────────────────
    {
        key: 'dashboard',
        label: 'Inicio',
        icon: 'Home',
        path: '/home',
        parent_key: null,
        required_permission: null,   // Visible para todos los roles admin
        app_access: 'admin',
        group_title: 'GENERAL',
        sort_order: 1,
        is_active: true,
    },
    {
        key: 'companys',
        label: 'Compañias',
        icon: 'Building2',
        path: '/companys',
        parent_key: null,
        required_permission: null,   // Visible para todos — el frontend ajusta label y destino por rol
        app_access: 'admin',
        group_title: 'GENERAL',
        sort_order: 2,
        is_active: true,
    },
    {
        key: 'bookings',
        label: 'Reservas',
        icon: 'TbCalendarCheck',
        path: '/bookings',
        parent_key: null,
        required_permission: 'booking.view_facility',
        app_access: 'admin',
        group_title: 'GENERAL',
        sort_order: 3,
        is_active: true,
    },
    {
        key: 'users',
        label: 'Usuarios',
        icon: 'Users2',
        path: '/users',
        parent_key: null,
        required_permission: 'user.manage_all',
        app_access: 'admin',
        group_title: 'GENERAL',
        sort_order: 4,
        is_active: true,
    },

    // ── Grupo: SUPPORT ────────────────────────────────────────────────
    {
        key: 'reports',
        label: 'Reportes',
        icon: 'FileText',
        path: '/reports',
        parent_key: null,
        required_permission: 'reports.view',
        app_access: 'admin',
        group_title: 'SUPPORT',
        sort_order: 1,
        is_active: true,
    },
    {
        key: 'statistics',
        label: 'Estadísticas',
        icon: 'BarChart2',
        path: '/statistics',
        parent_key: null,
        required_permission: 'statistics.view',
        app_access: 'admin',
        group_title: 'SUPPORT',
        sort_order: 2,
        is_active: true,
    },

    // ── Grupo: CONFIG (solo system) ───────────────────────────────────
    {
        key: 'permissions',
        label: 'Roles y Permisos',
        icon: 'ShieldCheck',
        path: '/permissions',
        parent_key: null,
        required_permission: 'role.manage',
        app_access: 'admin',
        group_title: 'CONFIG',
        sort_order: 1,
        is_active: true,
    },
    {
        key: 'menu_config',
        label: 'Configurar Menú',
        icon: 'Menu',
        path: '/menu-config',
        parent_key: null,
        required_permission: 'menu.manage',
        app_access: 'admin',
        group_title: 'CONFIG',
        sort_order: 2,
        is_active: true,
    },
];

const seedMenuItems = async () => {
    console.log('📋 Creando ítems de menú...');

    for (const item of MENU_ITEMS) {
        const [, created] = await MenuItem.findOrCreate({
            where: { key: item.key },
            defaults: item,
        });
        if (!created) {
            await MenuItem.update(
                {
                    label: item.label,
                    icon: item.icon,
                    path: item.path,
                    required_permission: item.required_permission,
                    group_title: item.group_title,
                    sort_order: item.sort_order,
                    is_active: item.is_active,
                },
                { where: { key: item.key } }
            );
        }
    }

    console.log(`   ✅ ${MENU_ITEMS.length} ítems de menú sincronizados`);
};

module.exports = { seedMenuItems, MENU_ITEMS };
