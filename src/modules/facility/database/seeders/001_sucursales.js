/**
 * Seeder: sucursales de prueba (solo desarrollo)
 * seedName debe coincidir con el registrado en dsg_bss_seed_meta en producción.
 */
const { Company } = require('../../models');
const Ubigeo = require('../../../catalogs/models/Ubigeo');

// Definición base de sucursales — distCode se resuelve a ubigeo_id en tiempo de ejecución
const sucursalesSeedBase = [
    {
        name: 'Sport Center Pucallpa',
        address: 'Av. Pardo 123, Miraflores',
        distCode: '150121', // Miraflores ──────────────────────────────────────
        phone_cell: '987654321',
        phone: '012223333',
        document: '20555666778',
        opening_time: '06:00:00',
        closing_time: '23:00:00',
        min_price: 45.00,
        features: 'Estacionamiento, Vestuarios, Iluminación LED, Cafetería',
        postal_code: '15074',
        website: 'https://sportcentermiraflores.com',
        description: 'El mejor centro deportivo en el corazón de Miraflores con canchas de grass sintético de última generación.',
        latitude: -12.115000,
        longitude: -77.028000,
        tenant_id: 'tenant-default',
        country_id: 6,
        is_enabled: 'A',
        status: 'ACTIVE'
    },
    {
        name: 'Sport Center San Borja',
        address: 'Av. Aviación 789, San Borja',
        distCode: '150130', // San Borja ────────────────────────────────────────
        phone_cell: '987654322',
        phone: '012223334',
        document: '20555666779',
        opening_time: '07:00:00',
        closing_time: '22:00:00',
        min_price: 55.00,
        features: 'Wi-Fi, Duchas, Tienda Deportiva, Estacionamiento',
        postal_code: '15037',
        website: 'https://sportcentersanborja.com',
        description: 'Instalaciones modernas en San Borja para la práctica de diversos deportes y actividades recreativas.',
        latitude: -12.098000,
        longitude: -76.995000,
        tenant_id: 'tenant-default',
        country_id: 6,
        is_enabled: 'A',
        status: 'ACTIVE'
    },
    {
        name: 'Sport Center Surco',
        address: 'Av. Encalada 456, Santiago de Surco',
        distCode: '150140', // Santiago de Surco ────────────────────────────────
        phone_cell: '987654323',
        phone: '012223335',
        document: '20555666780',
        opening_time: '08:00:00',
        closing_time: '21:00:00',
        min_price: 60.00,
        features: 'Cámaras de Seguridad, Zona Lounge, Bebidas, Vestuarios',
        postal_code: '15033',
        website: 'https://sportcentersurco.com',
        description: 'Amplias canchas y servicios de primera en Santiago de Surco, ideal para torneos y eventos deportivos.',
        latitude: -12.128000,
        longitude: -76.985000,
        tenant_id: 'tenant-default',
        country_id: 6,
        is_enabled: 'A',
        status: 'ACTIVE'
    },
    {
        name: 'Sport Center La Molina',
        address: 'Av. Raúl Ferrero 101, La Molina',
        distCode: '150114', // La Molina ────────────────────────────────────────
        phone_cell: '987654324',
        phone: '012223336',
        document: '20555666781',
        opening_time: '06:00:00',
        closing_time: '22:00:00',
        min_price: 50.00,
        features: 'Estacionamiento Amplio, Áreas Verdes, Parrilla, Wi-Fi',
        postal_code: '15024',
        website: 'https://sportcenterlamolina.com',
        description: 'Ubicado en una zona tranquila de La Molina, ofrecemos un ambiente familiar y deportivo excepcional.',
        latitude: -12.075000,
        longitude: -76.925000,
        tenant_id: 'tenant-default',
        country_id: 6,
        is_enabled: 'A',
        status: 'ACTIVE'
    },
    {
        name: 'Sport Center Los Olivos',
        address: 'Av. Carlos Izaguirre 202, Los Olivos',
        distCode: '150117', // Los Olivos ───────────────────────────────────────
        phone_cell: '987654325',
        phone: '012223337',
        document: '20555666782',
        opening_time: '07:00:00',
        closing_time: '23:00:00',
        min_price: 40.00,
        features: 'Precios Económicos, Muy Céntrico, Iluminación, Seguridad',
        postal_code: '15301',
        website: 'https://sportcenterlosolivos.com',
        description: 'Tu mejor opción en el cono norte para disfrutar del deporte con amigos y familia a los mejores precios.',
        latitude: -11.992000,
        longitude: -77.070000,
        tenant_id: 'tenant-default',
        country_id: 6,
        is_enabled: 'A',
        status: 'ACTIVE'
    }
];

const seedFn = async (systemUserId) => {
    const withAudit = (data) => ({
        ...data,
        user_create: systemUserId,
        user_update: systemUserId
    });

    // Resolver ubigeo_ids para los distritos usados en las sucursales ──────────
    const ubigeoMap = {};
    const codes = ['150121', '150130', '150140', '150114', '150117', '150131'];
    for (const code of codes) {
        const rec = await Ubigeo.findOne({ where: { code, level: 3 } });
        if (rec) ubigeoMap[code] = rec.ubigeo_id; // Guardar id resuelto por código
    }

    console.log('🏢 Creando empresa principal y sucursales...');

    // Empresa principal — San Isidro ────────────────────────────────────────────
    const [mainCompany, mainCreated] = await Company.findOrCreate({
        where: { document: '20555666777' },
        defaults: withAudit({
            name: 'Sport Center Principal',
            address: 'Av. Javier Prado 456, San Isidro',
            ubigeo_id: ubigeoMap['150131'] || null, // San Isidro
            phone_cell: '999888777',
            phone: '014445555',
            document: '20555666777',
            postal_code: '15027',
            website: 'https://sportcenterprincipal.com',
            description: 'Sede principal de Sport Center, coordinando la excelencia deportiva en toda la ciudad.',
            latitude: -12.092000,
            longitude: -77.033000,
            tenant_id: 'tenant-default',
            country_id: 6,
            is_enabled: 'A',
            status: 'ACTIVE'
        })
    });

    if (mainCreated) {
        console.log('   ✅ Empresa principal creada');
    } else {
        console.log('   ℹ️  Empresa principal ya existe');
    }

    // Sucursales — resolviendo ubigeo_id desde distCode antes de persistir ──────
    for (const sucursalBase of sucursalesSeedBase) {
        // Extraer distCode (helper) y construir datos limpios para DB
        const { distCode, ...sucursalData } = sucursalBase;

        const [sucursal, created] = await Company.findOrCreate({
            where: { document: sucursalData.document },
            defaults: withAudit({
                ...sucursalData,
                ubigeo_id: ubigeoMap[distCode] || null, // FK ubigeo resuelto
                parent_company_id: mainCompany.company_id
            })
        });
        if (created) {
            console.log(`   ✅ Sucursal creada: ${sucursal.name}`);
        } else {
            console.log(`   ℹ️  Sucursal ya existe: ${sucursal.name}`);
        }
    }
};

module.exports = {
    seedName: 'sucursalesSeed',
    environment: 'demo',
    dependsOnSystemUser: true,
    order: 80,
    seedFn
};
