/**
 * empresasSeed.js
 *
 * Pobla 3 empresas independientes, cada una con:
 *   - 1 empresa principal (tenant propio)
 *   - 1 sucursal vinculada
 *   - 2 espacios deportivos distintos por sucursal
 *   - Configuración completa: propietario, redes, pagos, banco
 *
 * Idempotente: usa findOrCreate — se puede correr varias veces sin duplicar.
 */

const { Company, Configuration, Space } = require('../../models');
const { SurfaceType, SportType, SportCategory, Ubigeo } = require('../../../catalogs/models');

// ─── Datos de empresas ────────────────────────────────────────────────────────

const EMPRESAS = [
    {
        empresa: {
            name: 'Lima Deportes S.A.C.',
            document: '20601234567',
            address: 'Av. Larco 800, Miraflores, Lima',
            phone_cell: '999111222',
            phone: '016001111',
            website: 'https://limadeportes.com.pe',
            description: 'Red de canchas deportivas de alta gama en Lima Metropolitana. Instalaciones de clase mundial para deportistas de todos los niveles.',
            postal_code: '15074',
            latitude: -12.1190,
            longitude: -77.0300,
            country_id: 6,
            is_enabled: 'A',
            status: 'ACTIVE'
        },
        sucursal: {
            name: 'Lima Deportes - Sede Miraflores',
            document: '20601234568',
            address: 'Calle Berlín 120, Miraflores, Lima',
            phone_cell: '999111333',
            phone: '016002222',
            website: 'https://limadeportes.com.pe/miraflores',
            description: 'Sede principal en el corazón de Miraflores. Canchas de última generación con grass sintético certificado FIFA y cancha techada de parquet.',
            postal_code: '15074',
            opening_time: '06:30:00',
            closing_time: '23:00:00',
            min_price: 70.00,
            features: 'Grass Sintético FIFA,Vestuarios con duchas,Estacionamiento gratuito,Bar deportivo,Wi-Fi,Iluminación LED',
            parking_available: true,
            latitude: -12.1201,
            longitude: -77.0285,
            country_id: 6,
            is_enabled: 'A',
            status: 'ACTIVE'
        },
        configuracion: {
            social_facebook: 'https://facebook.com/limadeportes',
            social_instagram: 'https://instagram.com/limadeportes',
            social_whatsapp: '51999111333',
            whatsapp_message: 'Hola! Quiero reservar una cancha en Lima Deportes Miraflores 🏃',
        },
        espacios: [
            {
                name: 'Cancha Fútbol 7 - Grass Sintético A',
                sport_code: 'FOOTBALL',
                category_code: 'TEAM_SPORTS',
                surface_code: 'SYNTHETIC_GRASS',
                dimensions: '35x55 metros',
                capacity: 14,
                description: 'Cancha de grass sintético certificado FIFA con marcaciones reglamentarias, arcos de aluminio y red de alta resistencia. Ideal para campeonatos y partidos amistosos.',
                equipment: 'Arcos de aluminio,Redes reglamentarias,Balones de fútbol,Pecheras de colores',
                minimum_booking_minutes: 60,
                maximum_booking_minutes: 180,
                booking_buffer_minutes: 15,
                status_space: 'ACTIVE'
            },
            {
                name: 'Cancha Básquetbol - Parquet Techado',
                sport_code: 'BASKETBALL',
                category_code: 'TEAM_SPORTS',
                surface_code: 'PARQUET',
                dimensions: '15x28 metros',
                capacity: 12,
                description: 'Cancha techada con piso de parquet de alta resistencia, tableros profesionales ajustables y líneas pintadas reglamentarias NBA. Ambiente climatizado.',
                equipment: 'Tableros profesionales,Aros ajustables,Marcador electrónico,Balones de básquetbol,Cronómetro',
                minimum_booking_minutes: 60,
                maximum_booking_minutes: 120,
                booking_buffer_minutes: 10,
                status_space: 'ACTIVE'
            }
        ]
    },
    {
        empresa: {
            name: 'Norte Sport E.I.R.L.',
            document: '20702345678',
            address: 'Av. Alfredo Mendiola 3490, Los Olivos, Lima',
            phone_cell: '998222333',
            phone: '017003333',
            website: 'https://nortesport.pe',
            description: 'Empresa líder en instalaciones deportivas del Cono Norte de Lima. Precios accesibles y calidad garantizada para familias y equipos amateur.',
            postal_code: '15301',
            latitude: -11.9980,
            longitude: -77.0700,
            country_id: 6,
            is_enabled: 'A',
            status: 'ACTIVE'
        },
        sucursal: {
            name: 'Norte Sport - Sede Los Olivos',
            document: '20702345679',
            address: 'Jr. Las Vegas 258, Urb. El Naranjal, Los Olivos, Lima',
            phone_cell: '998222444',
            phone: '017004444',
            website: 'https://nortesport.pe/los-olivos',
            description: 'Sede principal de Norte Sport, con amplias instalaciones para fútbol 5, vóley playa y múltiples disciplinas deportivas. El favorito del Cono Norte.',
            postal_code: '15301',
            opening_time: '07:00:00',
            closing_time: '22:30:00',
            min_price: 40.00,
            features: 'Precios económicos,Canchas techadas,Zona snack,Seguridad 24h,Cámaras CCTV,Zona de calentamiento',
            parking_available: false,
            latitude: -11.9960,
            longitude: -77.0680,
            country_id: 6,
            is_enabled: 'A',
            status: 'ACTIVE'
        },
        configuracion: {
            social_facebook: 'https://facebook.com/nortesportperu',
            social_instagram: 'https://instagram.com/nortesport.pe',
            social_tiktok: 'https://tiktok.com/@nortesport',
            social_whatsapp: '51998222444',
            whatsapp_message: 'Hola Norte Sport! Quiero info sobre canchas disponibles 🏐',
        },
        espacios: [
            {
                name: 'Cancha Fútsal - Cemento Techado',
                sport_code: 'FUTSAL',
                category_code: 'TEAM_SPORTS',
                surface_code: 'CONCRETE',
                dimensions: '20x40 metros',
                capacity: 10,
                description: 'Cancha de fútsal bajo techo con piso de concreto pulido y sistema de drenaje. Iluminación LED de 500 lux para partidos nocturnos. La más popular del norte.',
                equipment: 'Arcos fútsal reglamentarios,Red doble,Balones fútsal,Sistema de iluminación LED',
                minimum_booking_minutes: 60,
                maximum_booking_minutes: 120,
                booking_buffer_minutes: 10,
                status_space: 'ACTIVE'
            },
            {
                name: 'Cancha Vóley - Techada Interior',
                sport_code: 'VOLLEYBALL',
                category_code: 'TEAM_SPORTS',
                surface_code: 'INDOOR_COURT',
                dimensions: '9x18 metros',
                capacity: 12,
                description: 'Cancha de vóley indoor con superficie antideslizante, red reglamentaria ajustable para varones y damas. Iluminación cenital de alta potencia para partidos oficiales.',
                equipment: 'Red ajustable FIVB,Postes de aluminio,Balones de vóley,Rodilleras de cortesía',
                minimum_booking_minutes: 60,
                maximum_booking_minutes: 120,
                booking_buffer_minutes: 10,
                status_space: 'ACTIVE'
            }
        ]
    },
    {
        empresa: {
            name: 'Arena Fit & Play S.A.C.',
            document: '20803456789',
            address: 'Av. Javier Prado Este 980, San Borja, Lima',
            phone_cell: '997333444',
            phone: '018005555',
            website: 'https://arenafit.com.pe',
            description: 'Club deportivo premium especializado en deportes de raqueta y disciplinas individuales. La experiencia deportiva más sofisticada de San Borja.',
            postal_code: '15037',
            latitude: -12.0950,
            longitude: -77.0010,
            country_id: 6,
            is_enabled: 'A',
            status: 'ACTIVE'
        },
        sucursal: {
            name: 'Arena Fit - Club San Borja',
            document: '20803456790',
            address: 'Calle Moroni 520, San Borja, Lima',
            phone_cell: '997333555',
            phone: '018006666',
            website: 'https://arenafit.com.pe/san-borja',
            description: 'El club de raqueta más exclusivo de Lima. Canchas de tenis en arcilla y pádel de cristal con instructores certificados y zona de recuperación.',
            postal_code: '15037',
            opening_time: '06:00:00',
            closing_time: '21:00:00',
            min_price: 90.00,
            features: 'Canchas de arcilla premium,Pádel de cristal panorámico,Pro shop,Fisioterapia,Spa deportivo,Cafetería gourmet',
            parking_available: true,
            latitude: -12.0940,
            longitude: -76.9990,
            country_id: 6,
            is_enabled: 'A',
            status: 'ACTIVE'
        },
        configuracion: {
            social_facebook: 'https://facebook.com/arenafitplay',
            social_instagram: 'https://instagram.com/arenafit.pe',
            social_youtube: 'https://youtube.com/@arenafitperu',
            social_whatsapp: '51997333555',
            whatsapp_message: '¡Hola Arena Fit! Deseo reservar una cancha de tenis o pádel 🎾',
        },
        espacios: [
            {
                name: 'Cancha Tenis - Arcilla Court 1',
                sport_code: 'TENNIS',
                category_code: 'RACKET_SPORTS',
                surface_code: 'CLAY',
                dimensions: '10.97x23.77 metros',
                capacity: 4,
                description: 'Cancha de tenis en tierra batida (arcilla) con medidas ITF reglamentarias, malla perimetral de 4m y alumbrado de 750 lux para partidos nocturnos. Renovada 2024.',
                equipment: 'Red ITF oficial,Lineas demarcadas,Carro recogebolas,Sillas de juez de silla',
                minimum_booking_minutes: 60,
                maximum_booking_minutes: 120,
                booking_buffer_minutes: 15,
                status_space: 'ACTIVE'
            },
            {
                name: 'Cancha Pádel - Cristal Panorámico A',
                sport_code: 'PADDLE',
                category_code: 'RACKET_SPORTS',
                surface_code: 'SYNTHETIC_COURT',
                dimensions: '6x20 metros',
                capacity: 4,
                description: 'Pista de pádel con paredes de cristal templado panorámico de 10mm, césped artificial de tercera generación y LED profesional de 600 lux. Espectacular para el juego nocturno.',
                equipment: 'Cristal templado 10mm,Cesped artificial 3G,Iluminación LED 600lux,Kit de raquetas disponible',
                minimum_booking_minutes: 60,
                maximum_booking_minutes: 90,
                booking_buffer_minutes: 15,
                status_space: 'ACTIVE'
            }
        ]
    }
];

// ─── Función principal ────────────────────────────────────────────────────────

const seedFn = async (systemUserId) => {
    const audit = (data) => ({ ...data, user_create: systemUserId, user_update: systemUserId });

    // Lookup de ubigeo_ids por código de distrito ─────────────────────────
    const [miraflores, losOlivos, sanBorja] = await Promise.all([
        Ubigeo.findOne({ where: { code: '150121', level: 3 } }),  // Miraflores
        Ubigeo.findOne({ where: { code: '150117', level: 3 } }),  // Los Olivos
        Ubigeo.findOne({ where: { code: '150130', level: 3 } })   // San Borja
    ]);

    // Obtener catálogos deportivos ─────────────────────────────────────────
    const [football, futsal, basketball, volleyball, tennis, paddle] = await Promise.all([
        SportType.findOne({ where: { code: 'FOOTBALL' } }),
        SportType.findOne({ where: { code: 'FUTSAL' } }),
        SportType.findOne({ where: { code: 'BASKETBALL' } }),
        SportType.findOne({ where: { code: 'VOLLEYBALL' } }),
        SportType.findOne({ where: { code: 'TENNIS' } }),
        SportType.findOne({ where: { code: 'PADDLE' } })
    ]);

    const [teamSports, racketSports] = await Promise.all([
        SportCategory.findOne({ where: { code: 'TEAM_SPORTS' } }),
        SportCategory.findOne({ where: { code: 'RACKET_SPORTS' } })
    ]);

    const [syntheticGrass, parquet, concrete, indoorCourt, clay, syntheticCourt] = await Promise.all([
        SurfaceType.findOne({ where: { code: 'SYNTHETIC_GRASS' } }),
        SurfaceType.findOne({ where: { code: 'PARQUET' } }),
        SurfaceType.findOne({ where: { code: 'CONCRETE' } }),
        SurfaceType.findOne({ where: { code: 'INDOOR_COURT' } }),
        SurfaceType.findOne({ where: { code: 'CLAY' } }),
        SurfaceType.findOne({ where: { code: 'SYNTHETIC_COURT' } })
    ]);

    const sportTypeMap = { FOOTBALL: football, FUTSAL: futsal, BASKETBALL: basketball, VOLLEYBALL: volleyball, TENNIS: tennis, PADDLE: paddle };
    const categoryMap  = { TEAM_SPORTS: teamSports, RACKET_SPORTS: racketSports };
    const surfaceMap   = { SYNTHETIC_GRASS: syntheticGrass, PARQUET: parquet, CONCRETE: concrete, INDOOR_COURT: indoorCourt, CLAY: clay, SYNTHETIC_COURT: syntheticCourt };

    // Mapa de ubigeo_id para cada empresa/sucursal por documento ─────────
    // Lima Deportes → Miraflores, Norte Sport → Los Olivos, Arena Fit → San Borja
    const ubigeoByDoc = {
        '20601234567': miraflores?.ubigeo_id || null,
        '20601234568': miraflores?.ubigeo_id || null,
        '20702345678': losOlivos?.ubigeo_id || null,
        '20702345679': losOlivos?.ubigeo_id || null,
        '20803456789': sanBorja?.ubigeo_id || null,
        '20803456790': sanBorja?.ubigeo_id || null,
    };

    console.log('\n🌱 Iniciando seed: 3 empresas + 3 sucursales + 6 espacios deportivos...\n');

    for (const entry of EMPRESAS) {
        const tenantId = `tenant-${entry.empresa.document}`;

        // ── 1. Empresa principal ──────────────────────────────────────────────
        const [empresa, empCreated] = await Company.findOrCreate({
            where: { document: entry.empresa.document },
            defaults: audit({
                ...entry.empresa,
                tenant_id: tenantId,
                ubigeo_id: ubigeoByDoc[entry.empresa.document] // Asignar distrito ubigeo
            })
        });

        console.log(`${empCreated ? '  ✅' : '  ℹ️ '} Empresa: ${empresa.name}`);

        // ── 2. Sucursal ───────────────────────────────────────────────────────
        const [sucursal, subCreated] = await Company.findOrCreate({
            where: { document: entry.sucursal.document },
            defaults: audit({
                ...entry.sucursal,
                tenant_id: tenantId,
                parent_company_id: empresa.company_id,
                ubigeo_id: ubigeoByDoc[entry.sucursal.document] // Asignar distrito ubigeo
            })
        });

        console.log(`${subCreated ? '    ✅' : '    ℹ️ '} Sucursal: ${sucursal.name}`);

        // ── 3. Configuración de la sucursal ───────────────────────────────────
        const [config, cfgCreated] = await Configuration.findOrCreate({
            where: { company_id: sucursal.company_id },
            defaults: audit({
                ...entry.configuracion,
                company_id: sucursal.company_id,
                tenant_id: tenantId
            })
        });

        console.log(`${cfgCreated ? '    ✅' : '    ℹ️ '} Configuración: propietario ${config.owner_name}`);

        // ── 4. Espacios deportivos ────────────────────────────────────────────
        for (const esp of entry.espacios) {
            const sportType = sportTypeMap[esp.sport_code];
            const category  = categoryMap[esp.category_code];
            const surface   = surfaceMap[esp.surface_code];

            if (!sportType || !category || !surface) {
                console.warn(`    ⚠️  Catálogo no encontrado para espacio "${esp.name}" (sport:${esp.sport_code}, cat:${esp.category_code}, surface:${esp.surface_code})`);
                continue;
            }

            const [space, spaceCreated] = await Space.findOrCreate({
                where: { name: esp.name, sucursal_id: sucursal.company_id },
                defaults: audit({
                    name: esp.name,
                    sucursal_id: sucursal.company_id,
                    tenant_id: tenantId,
                    sport_type_id: sportType.sport_type_id,
                    sport_category_id: category.sport_category_id,
                    surface_type_id: surface.surface_type_id,
                    dimensions: esp.dimensions,
                    capacity: esp.capacity,
                    description: esp.description,
                    equipment: esp.equipment,
                    minimum_booking_minutes: esp.minimum_booking_minutes,
                    maximum_booking_minutes: esp.maximum_booking_minutes,
                    booking_buffer_minutes: esp.booking_buffer_minutes,
                    status_space: esp.status_space
                })
            });

            console.log(`${spaceCreated ? '      ✅' : '      ℹ️ '} Espacio: ${space.name}`);
        }
    }

    console.log('\n🎉 Seed de empresas completado.\n');
};

module.exports = {
    seedName: 'empresasSeed',
    environment: 'demo',
    dependsOnSystemUser: true,
    order: 100,
    seedFn
};
