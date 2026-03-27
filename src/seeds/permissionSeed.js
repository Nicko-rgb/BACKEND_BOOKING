const { Permission } = require('../modules/catalogs/models');
const { RolePermission } = require('../modules/catalogs/models');
const { Role } = require('../modules/catalogs/models');

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
    { key: 'payment.reorder',          label: 'Reordenar métodos de pago de sucursal', module: 'payment',  app_access: 'admin' },
    { key: 'payment_account.manage',   label: 'Crear y editar cuentas de pago',        module: 'payment',  app_access: 'admin' },

    // ── Módulo: config ─────────────────────────────────────────────────
    { key: 'config.owner_manage',      label: 'Gestionar datos del propietario',       module: 'config',   app_access: 'admin' },
    { key: 'config.user_assign',       label: 'Asignar admin/empleado a sucursales',   module: 'config',   app_access: 'admin' },

    // ── Módulo: system ─────────────────────────────────────────────────
    { key: 'system.full_access',      label: 'Acceso total al sistema',          module: 'system', app_access: 'admin' },
    { key: 'role.manage',             label: 'Gestionar roles y permisos',       module: 'system', app_access: 'admin' },
    { key: 'country.manage',          label: 'Gestionar catálogo de países',     module: 'system', app_access: 'admin' },
    { key: 'payment_type.manage',     label: 'Gestionar tipos de pago',          module: 'system', app_access: 'admin' },
    { key: 'menu.manage',             label: 'Gestionar menú del sistema',       module: 'system', app_access: 'admin' },
];

/**
 * Mapeo de permisos por rol.
 * Fuente de verdad para poblar dsg_bss_role_permissions.
 */
const ROLE_PERMISSIONS = {
    cliente: [
        'booking.create',
        'booking.view_own',
        'booking.cancel_own',
        'payment.create',
        'rating.create',
        'profile.edit_own',
    ],
    empleado: [
        // Reservas — gestión completa dentro de su sucursal
        'booking.create',
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        // Instalaciones — solo visualización (no puede crear ni editar)
        'space.view',
        // Pagos — solo reordenar métodos existentes de su sucursal
        'payment.reorder',
    ],
    administrador: [
        // Instalaciones — puede editar su sucursal y sus espacios (no crear)
        'facility.manage_own',
        'space.manage_own',
        'space.view',
        'business_hour.manage',
        'media.manage_facility',
        'rating.view_facility',
        // Reservas
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        // Pagos — solo reordenar métodos existentes
        'payment.reorder',
        // Personal — gestiona empleados de su sucursal
        'employee.manage_own',
        // Reportes
        'reports.view',
        'statistics.view',
    ],
    super_admin: [
        // Empresa y sucursales — puede editar (no crear nuevas)
        'company.manage_own',
        'subsidiary.manage_own',
        'facility.manage_own',
        'space.manage_own',
        'space.view',
        'business_hour.manage',
        'media.manage_facility',
        'rating.view_facility',
        // Reservas
        'booking.view_facility',
        'booking.confirm',
        'booking.cancel',
        // Pagos — reordena métodos y gestiona cuentas de pago
        'payment.reorder',
        'payment_account.manage',
        // Usuarios — asigna admins y empleados a sus sucursales
        'administrator.manage_own',
        'employee.manage_own',
        'config.user_assign',
        // Reportes
        'reports.view',
        'statistics.view',
    ],
    system: [
        // Acceso total — bypasea todos los checks
        'system.full_access',
        // Gestión global de empresas, usuarios, instalaciones
        'company.manage_all',
        'user.manage_all',
        'facility.manage_all',
        'space.view',
        // Reservas y pagos
        'booking.manage_all',
        'payment.manage_all',
        'payment.reorder',
        'payment_account.manage',
        // Configuración avanzada — propietario, tipos de pago, catálogos
        'config.owner_manage',
        'config.user_assign',
        'country.manage',
        'payment_type.manage',
        // Sistema
        'role.manage',
        'menu.manage',
        // Reportes
        'reports.view',
        'statistics.view',
    ],
};

const seedPermissions = async () => {
    console.log('🔐 Creando catálogo de permisos...');

    // 1. Insertar/actualizar permisos del catálogo
    for (const perm of PERMISSIONS_CATALOG) {
        const [, created] = await Permission.findOrCreate({
            where: { key: perm.key },
            defaults: perm,
        });
        if (!created) {
            await Permission.update(
                { label: perm.label, description: perm.description, module: perm.module, app_access: perm.app_access },
                { where: { key: perm.key } }
            );
        }
    }
    console.log(`   ✅ ${PERMISSIONS_CATALOG.length} permisos sincronizados`);

    // 2. Sincronizar role_permissions — reemplaza completo para que quede exacto al mapeo
    console.log('🔗 Sincronizando permisos por rol...');
    for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
        const role = await Role.findOne({ where: { role_name: roleName } });
        if (!role) {
            console.warn(`   ⚠️  Rol no encontrado: ${roleName} — saltando`);
            continue;
        }

        // Eliminar asignaciones antiguas del rol y re-insertar desde el mapeo actual
        await RolePermission.destroy({ where: { role_id: role.role_id } });
        await RolePermission.bulkCreate(
            permKeys.map(permKey => ({ role_id: role.role_id, permission_key: permKey }))
        );
        console.log(`   ✅ ${roleName}: ${permKeys.length} permisos sincronizados`);
    }
};

module.exports = { seedPermissions, PERMISSIONS_CATALOG, ROLE_PERMISSIONS };
