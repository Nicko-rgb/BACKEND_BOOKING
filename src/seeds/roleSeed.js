const bcrypt = require('bcryptjs');
const { User, UserRole } = require('../modules/users/models');
const { Role } = require('../modules/catalogs/models');

const systemUserSeed = {
    first_name: 'System',
    last_name: 'User',
    email: process.env.SYSTEM_SEED_EMAIL || 'system@gmail.com',
    phone: null,
    password: process.env.SYSTEM_SEED_PASSWORD || '123456',
};

const rolesIniciales = [
    {
        role_name: 'cliente',
        app_access: 'booking',
        description: 'Hace reservas y gestiona su perfil desde el portal de reservas',
    },
    {
        role_name: 'empleado',
        app_access: 'admin',
        description: 'Moderador de sucursal: crea y confirma reservas dentro de su sucursal asignada',
    },
    {
        role_name: 'administrador',
        app_access: 'admin',
        description: 'Administra una sucursal asignada y sus espacios deportivos',
    },
    {
        role_name: 'super_admin',
        app_access: 'admin',
        description: 'Dueño o representante legal: administra sus empresas y sucursales (tenant)',
    },
    {
        role_name: 'system',
        app_access: 'admin',
        description: 'Dueños del sistema: acceso total, gestiona empresas, usuarios y configuración global',
    }
];

const seedRolesAndSystemUser = async () => {
    console.log('👥 Creando roles...');
    for (const rolData of rolesIniciales) {
        const [rol, created] = await Role.findOrCreate({
            where: { role_name: rolData.role_name },
            defaults: rolData
        });
        if (created) {
            console.log(`   ✅ Rol creado: ${rol.role_name}`);
        } else {
            await rol.update({
                description: rolData.description,
                app_access: rolData.app_access
            });
            console.log(`   ✅ Rol actualizado: ${rol.role_name}`);
        }
    }

    console.log('👤 Creando usuario system...');
    const systemRole = await Role.findOne({ where: { role_name: 'system' } });
    if (!systemRole) throw new Error('No existe el rol "system".');

    const [systemUser, systemUserCreated] = await User.findOrCreate({
        where: { email: systemUserSeed.email },
        defaults: {
            ...systemUserSeed,
            password: systemUserSeed.password ? await bcrypt.hash(systemUserSeed.password, 10) : null
        }
    });

    if (!systemUserCreated) {
        await systemUser.update({
            first_name: systemUserSeed.first_name,
            last_name: systemUserSeed.last_name,
            ...(systemUserSeed.password ? { password: await bcrypt.hash(systemUserSeed.password, 10) } : {})
        });
    }

    await UserRole.findOrCreate({
        where: { user_id: systemUser.user_id, role_id: systemRole.role_id }
    });

    console.log(`   ✅ Usuario system listo (ID: ${systemUser.user_id})`);
    return systemUser.user_id;
};

module.exports = { seedRolesAndSystemUser };
