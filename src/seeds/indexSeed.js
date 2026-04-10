const { seedSystemUser } = require('./systemUserSeed');
const { seedPaises } = require('./paisesSeed');
const { seedUbigeo } = require('./ubigeoSeed');
const { seedSports } = require('./sportSeed');
const { seedSucursales } = require('./sucursalSeed');
const { seedSpaces } = require('./spaceSeed');
const { seedPaymentTypes } = require('./paymentTypeSeed');
const { seedEmpresas } = require('./empresasSeed');
const { seedPermissions } = require('./permissionSeed');
const { seedMenuItems } = require('./menuItemSeed');
const { runOnce } = require('./SeedMeta');

/**
 * Seeds esenciales — corren en cualquier entorno.
 * Cada seed está protegido por runOnce: si ya fue ejecutado en una
 * corrida anterior, se salta automáticamente sin tocar la base de datos.
 */
async function runEssentialSeeds() {
    console.log('🌱 Poblando datos esenciales del sistema...');

    // 1. Catálogo de permisos — debe correr primero (systemUserSeed lo necesita)
    await runOnce('permissionsSeed', () => seedPermissions());

    // 2. Usuario system — retorna su ID para pasarlo a los seeds siguientes
    let systemUserId;
    await runOnce('systemUserSeed', async () => {
        systemUserId = await seedSystemUser();
    });

    // Si el seed ya corrió antes, recuperar el systemUserId de la DB ───────────
    if (!systemUserId) {
        const { User } = require('../modules/users/models');
        const systemEmail = process.env.SYSTEM_SEED_EMAIL || 'system@gmail.com';
        const systemUser  = await User.findOne({ where: { email: systemEmail } });
        systemUserId = systemUser?.user_id;
    }

    // 3. Ítems de menú dinámico
    await runOnce('menuItemsSeed', () => seedMenuItems());

    // 4. Países
    await runOnce('paisesSeed', () => seedPaises(systemUserId));

    // 5. Ubigeo completo de Perú (departamentos, provincias, distritos)
    await runOnce('ubigeoSeed', () => seedUbigeo());

    // 6. Catálogos Deportivos y Pagos
    await runOnce('sportsSeed',      () => seedSports(systemUserId));
    await runOnce('paymentTypesSeed', () => seedPaymentTypes(systemUserId));

    return systemUserId;
}

/**
 * Seeds de demo — solo corren en entornos no productivos.
 * Incluye empresas, sucursales y espacios de prueba.
 * Nunca deben ejecutarse en producción.
 */
async function runDemoSeeds(systemUserId) {
    console.log('🧪 Poblando datos de demo (desarrollo)...');

    // También protegidos por runOnce para evitar duplicados en reinicios ──────
    await runOnce('sucursalesSeed', () => seedSucursales(systemUserId));
    await runOnce('spacesSeed',     () => seedSpaces(systemUserId));
    await runOnce('empresasSeed',   () => seedEmpresas(systemUserId));
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
