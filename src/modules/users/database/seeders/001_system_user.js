/**
 * Seeder: usuario system con todos los permisos
 * seedName debe coincidir con el registrado en dsg_bss_seed_meta en producción.
 * seedFn retorna el systemUserId para pasarlo a seeders posteriores.
 */
const bcrypt = require('bcryptjs');
const { User, UserPermission } = require('../../models');
const { Permission } = require('../../../catalogs/models');

// Datos del usuario del sistema ────────────────────────────────────────────────
const SYSTEM_USER_DATA = {
    first_name: 'System',
    last_name: 'User',
    email: process.env.SYSTEM_SEED_EMAIL || 'system@gmail.com',
    password: process.env.SYSTEM_SEED_PASSWORD || '123456',
    // Clasificador de tipo de usuario (no controla accesos, solo display)
    role: 'system',
};

/**
 * Crea el usuario 'system' y le asigna todos los permisos del catálogo.
 * Si el usuario ya existe, solo sincroniza sus permisos.
 * @returns {number} user_id del usuario system
 */
const seedFn = async () => {
    console.log('👤 Creando usuario system...');

    // Crear o recuperar el usuario system ──────────────────────────────────────
    const [systemUser, created] = await User.findOrCreate({
        where: { email: SYSTEM_USER_DATA.email },
        defaults: {
            first_name: SYSTEM_USER_DATA.first_name,
            last_name:  SYSTEM_USER_DATA.last_name,
            email:      SYSTEM_USER_DATA.email,
            role:       SYSTEM_USER_DATA.role,
            is_enabled: true,
            password:   SYSTEM_USER_DATA.password
                ? await bcrypt.hash(SYSTEM_USER_DATA.password, 10)
                : null,
        },
    });

    // Si ya existía, actualizar campos básicos ─────────────────────────────────
    if (!created) {
        await systemUser.update({
            first_name: SYSTEM_USER_DATA.first_name,
            last_name:  SYSTEM_USER_DATA.last_name,
            role:       SYSTEM_USER_DATA.role,
            ...(SYSTEM_USER_DATA.password
                ? { password: await bcrypt.hash(SYSTEM_USER_DATA.password, 10) }
                : {}
            ),
        });
    }

    // Obtener todas las claves de permisos del catálogo ────────────────────────
    const allPermissions = await Permission.findAll({ attributes: ['key'] });
    const allPermissionKeys = allPermissions.map(p => p.key);

    // Insertar todos los permisos al usuario system (ignorar duplicados) ───────
    await UserPermission.bulkCreate(
        allPermissionKeys.map(key => ({
            user_id:        systemUser.user_id,
            permission_key: key,
            granted_by:     systemUser.user_id,  // se auto-otorga en el seed
        })),
        { ignoreDuplicates: true }
    );

    console.log(`   ✅ Usuario system listo (ID: ${systemUser.user_id}, permisos: ${allPermissionKeys.length})`);
    return systemUser.user_id;
};

module.exports = {
    seedName: 'systemUserSeed',
    environment: 'essential',
    dependsOnSystemUser: false,
    order: 20,
    seedFn
};
