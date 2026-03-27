const { SportCategory, SportType, SurfaceType } = require('../modules/catalogs/models');

const categoriasDeportivasIniciales = [
    { code: 'TEAM_SPORTS', name: 'Deportes de Equipo' },
    { code: 'INDIVIDUAL_SPORTS', name: 'Deportes Individuales' },
    { code: 'RACKET_SPORTS', name: 'Deportes de Raqueta' },
    { code: 'WATER_SPORTS', name: 'Deportes Acuáticos' },
    { code: 'COMBAT_SPORTS', name: 'Deportes de Combate' },
    { code: 'FITNESS', name: 'Fitness y Acondicionamiento' }
];

const tiposDeportesIniciales = [
    { code: 'FOOTBALL', name: 'Fútbol' },
    { code: 'BASKETBALL', name: 'Básquetbol' },
    { code: 'VOLLEYBALL', name: 'Vóleibol' },
    { code: 'TENNIS', name: 'Tenis' },
    { code: 'PADDLE', name: 'Pádel' },
    { code: 'SQUASH', name: 'Squash' },
    { code: 'BADMINTON', name: 'Bádminton' },
    { code: 'TABLE_TENNIS', name: 'Tenis de Mesa' },
    { code: 'SWIMMING', name: 'Natación' },
    { code: 'BOXING', name: 'Boxeo' },
    { code: 'MARTIAL_ARTS', name: 'Artes Marciales' },
    { code: 'GYM', name: 'Gimnasio' },
    { code: 'CROSSFIT', name: 'CrossFit' },
    { code: 'YOGA', name: 'Yoga' },
    { code: 'PILATES', name: 'Pilates' },
    { code: 'FUTSAL', name: 'Fútsal' },
    { code: 'HANDBALL', name: 'Handball' },
    { code: 'RUGBY', name: 'Rugby' },
    { code: 'AMERICAN_FOOTBALL', name: 'Fútbol Americano' },
    { code: 'BASEBALL', name: 'Béisbol' }
];

const tiposSuperficiesIniciales = [
    { code: 'NATURAL_GRASS', name: 'Césped Natural' },
    { code: 'SYNTHETIC_GRASS', name: 'Césped Sintético' },
    { code: 'CONCRETE', name: 'Cemento' },
    { code: 'ASPHALT', name: 'Asfalto' },
    { code: 'CLAY', name: 'Arcilla' },
    { code: 'HARD_COURT', name: 'Cancha Dura' },
    { code: 'WOOD', name: 'Madera' },
    { code: 'PARQUET', name: 'Parquet' },
    { code: 'RUBBER', name: 'Caucho' },
    { code: 'SAND', name: 'Arena' },
    { code: 'WATER', name: 'Agua' },
    { code: 'SYNTHETIC_COURT', name: 'Cancha Sintética' },
    { code: 'INDOOR_COURT', name: 'Cancha Techada' },
    { code: 'OUTDOOR_COURT', name: 'Cancha al Aire Libre' },
    { code: 'MULTI_SURFACE', name: 'Superficie Múltiple' }
];

const seedSports = async (systemUserId) => {
    const withAudit = (data) => ({
        ...data,
        user_create: systemUserId,
        user_update: systemUserId
    });

    console.log('🏆 Creando categorías deportivas...');
    for (const catData of categoriasDeportivasIniciales) {
        const [cat, created] = await SportCategory.findOrCreate({
            where: { code: catData.code },
            defaults: withAudit(catData)
        });
        if (created) {
            console.log(`   ✅ Categoría deportiva creada: ${cat.name}`);
        } else {
            console.log(`   ℹ️  Categoría deportiva ya existe: ${cat.name}`);
        }
    }

    console.log('⚽ Creando tipos de deportes...');
    for (const sportData of tiposDeportesIniciales) {
        const [sport, created] = await SportType.findOrCreate({
            where: { code: sportData.code },
            defaults: withAudit(sportData)
        });
        if (created) {
            console.log(`   ✅ Tipo de deporte creado: ${sport.name}`);
        } else {
            console.log(`   ℹ️  Tipo de deporte ya existe: ${sport.name}`);
        }
    }

    console.log('🏟️ Creando tipos de superficies...');
    for (const surfaceData of tiposSuperficiesIniciales) {
        const [surface, created] = await SurfaceType.findOrCreate({
            where: { code: surfaceData.code },
            defaults: withAudit(surfaceData)
        });
        if (created) {
            console.log(`   ✅ Tipo de superficie creado: ${surface.name}`);
        } else {
            console.log(`   ℹ️  Tipo de superficie ya existe: ${surface.name}`);
        }
    }
};

module.exports = { seedSports };
