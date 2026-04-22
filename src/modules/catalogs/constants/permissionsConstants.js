/**
 * permissionsConstants.js
 * Catálogo de permisos y permisos por defecto por tipo de rol.
 *
 * Estos datos son de referencia de negocio — se usan tanto en el seed
 * de permisos como en runtime (UserRepository, UserManagementService)
 * para asignar permisos iniciales al crear usuarios.
 */

/**
 * Catálogo completo de permisos del sistema.
 * Cada permiso tiene una clave única tipo 'modulo.accion'.
 */
const PERMISSIONS_CATALOG = [
    // ── Módulo: booking ────────────────────────────────────────────────
    { key: 'booking.create',          label: 'Crear reserva',                    module: 'booking', app_access: 'both' },
    { key: 'booking.view_own',        label: 'Ver reservas propias',             module: 'booking', app_access: 'both' },
    { key: 'booking.cancel_own',      label: 'Cancelar reservas propias',        module: 'booking', app_access: 'both' },
    { key: 'booking.view_facility',   label: 'Ver reservas de sucursal',         module: 'booking', app_access: 'admin' },
    { key: 'booking.confirm',         label: 'Confirmar pago de reserva',        module: 'booking', app_access: 'admin' },
    { key: 'booking.cancel',          label: 'Cancelar cualquier reserva',       module: 'booking', app_access: 'admin' },
    { key: 'booking.manage_all',      label: 'Gestión total de reservas',        module: 'booking', app_access: 'admin' },

    // ── Módulo: payment ────────────────────────────────────────────────
    { key: 'payment.create',          label: 'Crear pago',                       module: 'payment', app_access: 'both' },
    { key: 'payment.manage_all',      label: 'Gestión total de pagos',           module: 'payment', app_access: 'admin' },

    // ── Módulo: facility ───────────────────────────────────────────────
    { key: 'facility.manage_own',     label: 'Gestionar instalaciones propias',  module: 'facility', app_access: 'admin' },
    { key: 'facility.manage_all',     label: 'Gestionar todas las instalaciones',module: 'facility', app_access: 'admin' },
    { key: 'space.view',              label: 'Ver espacios deportivos',          module: 'facility', app_access: 'admin' },
    { key: 'space.manage_own',        label: 'Gestionar espacios propios',       module: 'facility', app_access: 'admin' },
    { key: 'business_hour.manage',    label: 'Gestionar horarios de atención',   module: 'facility', app_access: 'admin' },
    { key: 'media.manage_facility',   label: 'Gestionar imágenes de instalación',module: 'facility', app_access: 'admin' },
    { key: 'rating.create',           label: 'Crear valoración',                 module: 'facility', app_access: 'both' },
    { key: 'rating.view_facility',    label: 'Ver valoraciones de sucursal',     module: 'facility', app_access: 'admin' },

    // ── Módulo: company ────────────────────────────────────────────────
    { key: 'company.manage_own',      label: 'Gestionar empresa propia',         module: 'company', app_access: 'admin' },
    { key: 'company.manage_all',      label: 'Gestionar todas las empresas',     module: 'company', app_access: 'admin' },
    { key: 'subsidiary.manage_own',   label: 'Gestionar sucursales propias',     module: 'company', app_access: 'admin' },

    // ── Módulo: users ──────────────────────────────────────────────────
    { key: 'profile.edit_own',        label: 'Editar perfil propio',             module: 'users', app_access: 'both' },
    { key: 'user.manage_all',         label: 'Gestionar todos los usuarios',     module: 'users', app_access: 'admin' },
    { key: 'employee.manage_own',     label: 'Gestionar empleados de sucursal',  module: 'users', app_access: 'admin' },
    { key: 'administrator.manage_own',label: 'Gestionar administradores',        module: 'users', app_access: 'admin' },

    // ── Módulo: reports ────────────────────────────────────────────────
    { key: 'reports.view',            label: 'Ver reportes',                     module: 'reports', app_access: 'admin' },
    { key: 'statistics.view',         label: 'Ver estadísticas',                 module: 'reports', app_access: 'admin' },

    // ── Módulo: payment (gestión administrativa) ──────────────────────
    { key: 'payment.reorder',         label: 'Reordenar métodos de pago de sucursal', module: 'payment',  app_access: 'admin' },
    { key: 'payment_account.manage',  label: 'Crear y editar cuentas de pago',        module: 'payment',  app_access: 'admin' },

    // ── Módulo: config ─────────────────────────────────────────────────
    { key: 'config.owner_manage',     label: 'Gestionar datos del propietario',       module: 'config',   app_access: 'admin' },
    { key: 'config.user_assign',      label: 'Asignar admin/empleado a sucursales',   module: 'config',   app_access: 'admin' },

    // ── Módulo: system ─────────────────────────────────────────────────
    { key: 'system.full_access',      label: 'Acceso total al sistema',          module: 'system', app_access: 'admin' },
    { key: 'role.manage',             label: 'Gestionar roles y permisos',       module: 'system', app_access: 'admin' },
    { key: 'country.manage',          label: 'Gestionar catálogo de países',     module: 'system', app_access: 'admin' },
    { key: 'payment_type.manage',     label: 'Gestionar tipos de pago',          module: 'system', app_access: 'admin' },
    { key: 'menu.manage',             label: 'Gestionar menú del sistema',       module: 'system', app_access: 'admin' },
    { key: 'sport_type.manage',       label: 'Gestionar tipos de deporte',       module: 'system', app_access: 'admin' },
    { key: 'sport_category.manage',   label: 'Gestionar categorías deportivas',  module: 'system', app_access: 'admin' },
    { key: 'surface_type.manage',     label: 'Gestionar tipos de superficie',    module: 'system', app_access: 'admin' },
    { key: 'ubigeo.manage',           label: 'Gestionar ubigeo (divisiones geográficas)', module: 'system', app_access: 'admin' },
];

/**
 * Permisos por defecto que se insertan en user_permissions al crear un usuario.
 * Usado por UserRepository.createUserWithPermissions() y assignUserToCompany().
 *
 * Fuente de verdad para los permisos iniciales de cada tipo de usuario.
 */
const DEFAULT_PERMISSIONS = {
    cliente: [
        'booking.create',
        'booking.view_own',
        'booking.cancel_own',
        'payment.create',
        'rating.create',
        'profile.edit_own',
    ],
    empleado: [
        'booking.create',
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        'space.view',
        'payment.reorder',
    ],
    administrador: [
        'facility.manage_own',
        'space.manage_own',
        'space.view',
        'business_hour.manage',
        'media.manage_facility',
        'rating.view_facility',
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        'payment.reorder',
        'employee.manage_own',
        'reports.view',
        'statistics.view',
    ],
    super_admin: [
        'company.manage_own',
        'subsidiary.manage_own',
        'facility.manage_own',
        'space.manage_own',
        'space.view',
        'business_hour.manage',
        'media.manage_facility',
        'rating.view_facility',
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        'payment.reorder',
        'payment_account.manage',
        'administrator.manage_own',
        'employee.manage_own',
        'config.user_assign',
        'reports.view',
        'statistics.view',
    ],
    system: [
        // El middleware ya hace bypass para system.full_access.
        // Se asignan todos los permisos del catálogo en systemUserSeed.
        'system.full_access',
    ],
};

module.exports = { PERMISSIONS_CATALOG, DEFAULT_PERMISSIONS };
