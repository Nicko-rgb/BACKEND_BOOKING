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
 * Función principal para poblar todos los datos iniciales
 */
async function runAllSeeds() {
    try {
        console.log('🌱 Iniciando población de datos (Refactored)...');

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

        // 6. Empresas y Sucursales
        await seedSucursales(systemUserId);

        // 7. Espacios Deportivos (sucursales del seed original)
        await seedSpaces(systemUserId);

        // 8. Empresas de prueba con tenants separados (3 empresas, 3 sucursales, 6 espacios)
        await seedEmpresas(systemUserId);

        console.log('🎉 ¡Todos los datos han sido poblados exitosamente!');
        return true;
    } catch (error) {
        console.error('❌ Error general en la población de datos:', error);
        throw error;
    }
}

module.exports = { runAllSeeds };
