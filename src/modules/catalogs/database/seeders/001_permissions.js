/**
 * Seeder: permisos del sistema (dsg_bss_permissions)
 * Inserta nuevos permisos y actualiza los existentes.
 */
const { Permission } = require('../../models');
const { PERMISSIONS_CATALOG } = require('../../constants/permissionsConstants');

// Función del seed ────────────────────────────────────────────────────────────
const seedFn = async () => {
    console.log('🔐 Creando catálogo de permisos...');

    for (const perm of PERMISSIONS_CATALOG) {
        const [, created] = await Permission.findOrCreate({
            where:    { key: perm.key },
            defaults: perm,
        });
        // Actualizar label/módulo si el permiso ya existía ───────────────────
        if (!created) {
            await Permission.update(
                { label: perm.label, module: perm.module, app_access: perm.app_access },
                { where: { key: perm.key } }
            );
        }
    }

    console.log(`   ✅ ${PERMISSIONS_CATALOG.length} permisos sincronizados`);
};

module.exports = {
    // V2: incorpora permisos de administración de catálogos (sport_type.manage, etc.)
    seedName: 'permissionsSeedV2',
    environment: 'essential',
    dependsOnSystemUser: false,
    order: 10,
    seedFn
};
