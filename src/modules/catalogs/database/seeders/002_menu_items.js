/**
 * Seeder: ítems del menú de navegación (dsg_bss_menu_items)
 * El campo required_permission controla qué usuarios pueden ver cada ítem.
 * El campo parent_key permite anidar ítems (submenús dentro del sidebar).
 */
const { MenuItem } = require('../../models');

// Datos del menú ──────────────────────────────────────────────────────────────
const MENU_ITEMS = [
    // ── Grupo: GENERAL ────────────────────────────────────────────────
    { key: 'dashboard', label: 'Inicio', icon: 'Home', path: '/home', parent_key: null, required_permission: null, app_access: 'admin', group_title: 'GENERAL', sort_order: 1, is_active: true },
    { key: 'companys', label: 'Compañias', icon: 'Building2', path: '/companys', parent_key: null, required_permission: null, app_access: 'admin', group_title: 'GENERAL', sort_order: 2, is_active: true },
    { key: 'bookings', label: 'Reservas', icon: 'TbCalendarCheck', path: '/bookings', parent_key: null, required_permission: 'booking.view_facility', app_access: 'admin', group_title: 'GENERAL', sort_order: 3, is_active: true },
    { key: 'users', label: 'Usuarios', icon: 'Users2', path: '/users', parent_key: null, required_permission: 'user.manage_all', app_access: 'admin', group_title: 'GENERAL', sort_order: 4, is_active: true },

    // ── Grupo: SUPPORT ────────────────────────────────────────────────
    { key: 'reports', label: 'Reportes', icon: 'FileText', path: '/reports', parent_key: null, required_permission: 'reports.view', app_access: 'admin', group_title: 'SUPPORT', sort_order: 1, is_active: true },
    { key: 'statistics', label: 'Estadísticas', icon: 'BarChart2', path: '/statistics', parent_key: null, required_permission: 'statistics.view', app_access: 'admin', group_title: 'SUPPORT', sort_order: 2, is_active: true },

    // ── Grupo: SISTEMA (solo system por convención — permisos de módulo system) ─
    { key: 'permissions', label: 'Roles y Permisos', icon: 'ShieldCheck', path: '/system/permissions', parent_key: null, required_permission: 'role.manage', app_access: 'admin', group_title: 'SISTEMA', sort_order: 1, is_active: true },
    { key: 'menu_config', label: 'Configurar Menú', icon: 'Menu', path: '/system/menu', parent_key: null, required_permission: 'menu.manage', app_access: 'admin', group_title: 'SISTEMA', sort_order: 2, is_active: true },

    // ── Grupo: SISTEMA — Catálogos (padre + hijos) ────────────────────
    { key: 'catalogs', label: 'Catálogos', icon: 'Layers', path: null, parent_key: null, required_permission: 'system.full_access', app_access: 'admin', group_title: 'SISTEMA', sort_order: 3, is_active: true },

    { key: 'cat_countries',      label: 'Países',             icon: 'Globe',       path: '/system/catalogs/countries',        parent_key: 'catalogs', required_permission: 'country.manage',        app_access: 'admin', group_title: 'SISTEMA', sort_order: 1, is_active: true },
    { key: 'cat_sport_types',    label: 'Deportes',           icon: 'Trophy',      path: '/system/catalogs/sport-types',      parent_key: 'catalogs', required_permission: 'sport_type.manage',     app_access: 'admin', group_title: 'SISTEMA', sort_order: 2, is_active: true },
    { key: 'cat_sport_cats',     label: 'Categorías',         icon: 'Tags',        path: '/system/catalogs/sport-categories', parent_key: 'catalogs', required_permission: 'sport_category.manage', app_access: 'admin', group_title: 'SISTEMA', sort_order: 3, is_active: true },
    { key: 'cat_surface_types',  label: 'Superficies',        icon: 'Grid3x3',     path: '/system/catalogs/surface-types',    parent_key: 'catalogs', required_permission: 'surface_type.manage',   app_access: 'admin', group_title: 'SISTEMA', sort_order: 4, is_active: true },
    { key: 'cat_payment_types',  label: 'Tipos de pago',      icon: 'CreditCard',  path: '/system/catalogs/payment-types',    parent_key: 'catalogs', required_permission: 'payment_type.manage',   app_access: 'admin', group_title: 'SISTEMA', sort_order: 5, is_active: true },
    { key: 'cat_ubigeo',         label: 'Ubigeo',             icon: 'MapPin',      path: '/system/catalogs/ubigeo',           parent_key: 'catalogs', required_permission: 'ubigeo.manage',         app_access: 'admin', group_title: 'SISTEMA', sort_order: 6, is_active: true },
];

// Función del seed ────────────────────────────────────────────────────────────
const seedFn = async () => {
    console.log('📋 Creando ítems de menú...');

    for (const item of MENU_ITEMS) {
        const [, created] = await MenuItem.findOrCreate({
            where: { key: item.key },
            defaults: item,
        });
        // Actualizar todos los campos si ya existe — mantiene el seed como fuente de verdad
        if (!created) {
            await MenuItem.update(
                {
                    label:               item.label,
                    icon:                item.icon,
                    path:                item.path,
                    parent_key:          item.parent_key,
                    required_permission: item.required_permission,
                    app_access:          item.app_access,
                    group_title:         item.group_title,
                    sort_order:          item.sort_order,
                    is_active:           item.is_active,
                },
                { where: { key: item.key } }
            );
        }
    }

    console.log(`   ✅ ${MENU_ITEMS.length} ítems de menú sincronizados`);
};

module.exports = {
    // V2: añade grupo SISTEMA + submenús de catálogos
    seedName: 'menuItemsSeedV2',
    environment: 'essential',
    dependsOnSystemUser: false,
    order: 30,
    seedFn
};
