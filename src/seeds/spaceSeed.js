const { Space, Company } = require('../modules/facility/models');
const { SurfaceType, SportType, SportCategory } = require('../modules/catalogs/models');

/**
 * Seed para espacios deportivos
 * Crea 2 espacios para cada una de las 3 primeras sucursales (Total 6 espacios)
 */
const seedSpaces = async (systemUserId) => {
    const withAudit = (data) => ({
        ...data,
        user_create: systemUserId,
        user_update: systemUserId
    });

    console.log('🏟️ Creando espacios deportivos...');

    // 1. Obtener catálogos necesarios para los espacios
    const football = await SportType.findOne({ where: { code: 'FOOTBALL' } });
    const basketball = await SportType.findOne({ where: { code: 'BASKETBALL' } });
    const teamSports = await SportCategory.findOne({ where: { code: 'TEAM_SPORTS' } });
    const syntheticGrass = await SurfaceType.findOne({ where: { code: 'SYNTHETIC_GRASS' } });
    const wood = await SurfaceType.findOne({ where: { code: 'WOOD' } });

    if (!football || !basketball || !teamSports || !syntheticGrass || !wood) {
        console.error('❌ No se encontraron los catálogos necesarios. Asegúrate de correr sportSeed primero.');
        return;
    }

    // 2. Obtener las primeras 3 sucursales (compañías con parent_company_id)
    const sucursales = await Company.findAll({
        where: { parent_company_id: { [require('sequelize').Op.ne]: null } },
        limit: 3
    });

    if (sucursales.length < 3) {
        console.warn(`⚠️ Se encontraron solo ${sucursales.length} sucursales. Se crearán espacios para las disponibles.`);
    }

    const spaceTemplates = [
        {
            name: 'Cancha de Fútbol 7 - A',
            sport_type_id: football.sport_type_id,
            sport_category_id: teamSports.sport_category_id,
            surface_type_id: syntheticGrass.surface_type_id,
            dimensions: '20x40 metros',
            capacity: 14,
            description: 'Cancha de grass sintético ideal para partidos de 7 contra 7.',
            status_space: 'ACTIVE'
        },
        {
            name: 'Cancha de Básquetbol - Techada',
            sport_type_id: basketball.sport_type_id,
            sport_category_id: teamSports.sport_category_id,
            surface_type_id: wood.surface_type_id,
            dimensions: '15x28 metros',
            capacity: 10,
            description: 'Cancha de madera con medidas oficiales y tableros profesionales.',
            status_space: 'ACTIVE'
        }
    ];

    for (const sucursal of sucursales) {
        console.log(`   🏢 Procesando sucursal: ${sucursal.name}`);
        
        for (const template of spaceTemplates) {
            const [space, created] = await Space.findOrCreate({
                where: { 
                    name: `${template.name} (${sucursal.name})`,
                    sucursal_id: sucursal.company_id 
                },
                defaults: withAudit({
                    ...template,
                    name: `${template.name} (${sucursal.name})`,
                    sucursal_id: sucursal.company_id,
                    tenant_id: sucursal.tenant_id
                })
            });

            if (created) {
                console.log(`      ✅ Espacio creado: ${space.name}`);
            } else {
                console.log(`      ℹ️  Espacio ya existe: ${space.name}`);
            }
        }
    }
};

module.exports = { seedSpaces };
