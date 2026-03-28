const { seedRolesAndSystemUser } = require('./roleSeed');
const { seedPaises } = require('./paisesSeed');
const { seedSports } = require('./sportSeed');
const { seedSucursales } = require('./sucursalSeed');
const { seedSpaces } = require('./spaceSeed');
const { seedPaymentTypes } = require('./paymentTypeSeed');
const { seedEmpresas } = require('./empresasSeed');
const { seedPermissions } = require('./permissionSeed');
const { seedMenuItems } = require('./menuItemSeed');

/**
 * Seeds esenciales — corren en cualquier entorno.
 * Incluye roles, permisos, menú, países, deportes y tipos de pago.
 * Son necesarios para que el sistema funcione correctamente.
 */
async function runEssentialSeeds() {
    console.log('🌱 Poblando datos esenciales del sistema...');

    // 1. Roles y Usuario del Sistema (Requerido para auditoría)
    const systemUserId = await seedRolesAndSystemUser();

    // 2. Permisos y asignación a roles (debe ir después de roles)
    await seedPermissions();

    // 3. Ítems de menú dinámico
    await seedMenuItems();

    // 4. Geografía (Países, Deptos, etc)
    await seedPaises(systemUserId);

    // 5. Catálogos Deportivos y Pagos
    await seedSports(systemUserId);
    await seedPaymentTypes(systemUserId);

    return systemUserId;
}

/**
 * Seeds de demo — solo corren en entornos no productivos.
 * Incluye empresas, sucursales y espacios de prueba.
 * Nunca deben ejecutarse en producción.
 */
async function runDemoSeeds(systemUserId) {
    console.log('🧪 Poblando datos de demo (desarrollo)...');

    // 6. Empresas y Sucursales de prueba
    await seedSucursales(systemUserId);

    // 7. Espacios Deportivos de prueba
    await seedSpaces(systemUserId);

    // 8. Empresas de prueba con tenants separados (3 empresas, 3 sucursales, 6 espacios)
    await seedEmpresas(systemUserId);
}

/**
 * Función principal para poblar todos los datos iniciales.
 * En producción solo corre los seeds esenciales.
 * En desarrollo corre también los seeds de demo.
 */
async function runAllSeeds() {
    try {
        console.log('🌱 Iniciando población de datos...');

        // Siempre corren los seeds esenciales ──────────────────────────────────
        const systemUserId = await runEssentialSeeds();

        // Seeds de demo solo en entornos no productivos ────────────────────────
        const isProduction = process.env.NODE_ENV === 'production';
        if (!isProduction) {
            await runDemoSeeds(systemUserId);
        } else {
            console.log('⚠️  Entorno producción: seeds de demo omitidos.');
        }

        console.log('🎉 ¡Todos los datos han sido poblados exitosamente!');
        return true;
    } catch (error) {
        console.error('❌ Error general en la población de datos:', error);
        throw error;
    }
}

module.exports = { runAllSeeds, runEssentialSeeds };
