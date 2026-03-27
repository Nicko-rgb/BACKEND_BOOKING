/**
 * paisesSeed.js
 * Pobla países y la tabla ubigeo unificada (departamentos, provincias y distritos de Perú).
 * Idempotente: usa findOrCreate.
 */
const { Country } = require('../modules/catalogs/models');
const Ubigeo = require('../modules/catalogs/models/Ubigeo');

// ─── Países ───────────────────────────────────────────────────────────────────
const paisesIniciales = [
    { country: 'Argentina', iso_country: 'AR', phone_code: '+54', iso_currency: 'ARS', currency: 'Peso Argentino', currency_simbol: '$', time_zone: 'America/Argentina/Buenos_Aires', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/ar.svg' },
    { country: 'Brasil', iso_country: 'BR', phone_code: '+55', iso_currency: 'BRL', currency: 'Real Brasileño', currency_simbol: 'R$', time_zone: 'America/Sao_Paulo', language: 'pt', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/br.svg' },
    { country: 'Chile', iso_country: 'CL', phone_code: '+56', iso_currency: 'CLP', currency: 'Peso Chileno', currency_simbol: '$', time_zone: 'America/Santiago', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/cl.svg' },
    { country: 'Colombia', iso_country: 'CO', phone_code: '+57', iso_currency: 'COP', currency: 'Peso Colombiano', currency_simbol: '$', time_zone: 'America/Bogota', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/co.svg' },
    { country: 'México', iso_country: 'MX', phone_code: '+52', iso_currency: 'MXN', currency: 'Peso Mexicano', currency_simbol: '$', time_zone: 'America/Mexico_City', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/mx.svg' },
    { country: 'Perú', iso_country: 'PE', phone_code: '+51', iso_currency: 'PEN', currency: 'Sol Peruano', currency_simbol: 'S/', time_zone: 'America/Lima', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/pe.svg' },
    { country: 'Ecuador', iso_country: 'EC', phone_code: '+593', iso_currency: 'USD', currency: 'Dólar Estadounidense', currency_simbol: '$', time_zone: 'America/Guayaquil', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/ec.svg' },
    { country: 'Uruguay', iso_country: 'UY', phone_code: '+598', iso_currency: 'UYU', currency: 'Peso Uruguayo', currency_simbol: '$U', time_zone: 'America/Montevideo', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/uy.svg' },
    { country: 'Paraguay', iso_country: 'PY', phone_code: '+595', iso_currency: 'PYG', currency: 'Guaraní Paraguayo', currency_simbol: '₲', time_zone: 'America/Asuncion', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/py.svg' },
    { country: 'Bolivia', iso_country: 'BO', phone_code: '+591', iso_currency: 'BOB', currency: 'Boliviano', currency_simbol: 'Bs.', time_zone: 'America/La_Paz', language: 'es', date_format: 'DD/MM/YYYY', flag_url: 'https://flagcdn.com/bo.svg' }
];

// ─── Ubigeo Perú — Departamentos (nivel 1) ───────────────────────────────────
const departamentosData = [
    { code: '01', name: 'Amazonas' },   { code: '02', name: 'Áncash' },
    { code: '03', name: 'Apurímac' },   { code: '04', name: 'Arequipa' },
    { code: '05', name: 'Ayacucho' },   { code: '06', name: 'Cajamarca' },
    { code: '07', name: 'Callao' },     { code: '08', name: 'Cusco' },
    { code: '09', name: 'Huancavelica' }, { code: '10', name: 'Huánuco' },
    { code: '11', name: 'Ica' },        { code: '12', name: 'Junín' },
    { code: '13', name: 'La Libertad' }, { code: '14', name: 'Lambayeque' },
    { code: '15', name: 'Lima' },       { code: '16', name: 'Loreto' },
    { code: '17', name: 'Madre de Dios' }, { code: '18', name: 'Moquegua' },
    { code: '19', name: 'Pasco' },      { code: '20', name: 'Piura' },
    { code: '21', name: 'Puno' },       { code: '22', name: 'San Martín' },
    { code: '23', name: 'Tacna' },      { code: '24', name: 'Tumbes' },
    { code: '25', name: 'Ucayali' }
];

// ─── Ubigeo Perú — Provincias Lima (nivel 2) ─────────────────────────────────
// code = dept(2) + prov(2) = 4 dígitos
const provinciasLimaData = [
    { code: '1501', name: 'Lima' },     { code: '1502', name: 'Barranca' },
    { code: '1503', name: 'Cajatambo' }, { code: '1504', name: 'Canta' },
    { code: '1505', name: 'Cañete' },   { code: '1506', name: 'Huaral' },
    { code: '1507', name: 'Huarochirí' }, { code: '1508', name: 'Huaura' },
    { code: '1509', name: 'Oyón' },     { code: '1510', name: 'Yauyos' }
];

// ─── Ubigeo Perú — Distritos Prov. Lima (nivel 3) ────────────────────────────
// code = dept(2) + prov(2) + dist(2) = 6 dígitos
const distritosLimaData = [
    { code: '150101', name: 'Lima' },           { code: '150102', name: 'Ancón' },
    { code: '150103', name: 'Ate' },            { code: '150104', name: 'Barranco' },
    { code: '150105', name: 'Breña' },          { code: '150106', name: 'Carabayllo' },
    { code: '150107', name: 'Chaclacayo' },     { code: '150108', name: 'Chorrillos' },
    { code: '150109', name: 'Cieneguilla' },    { code: '150110', name: 'Comas' },
    { code: '150111', name: 'El Agustino' },    { code: '150112', name: 'Independencia' },
    { code: '150113', name: 'Jesús María' },    { code: '150114', name: 'La Molina' },
    { code: '150115', name: 'La Victoria' },    { code: '150116', name: 'Lince' },
    { code: '150117', name: 'Los Olivos' },     { code: '150118', name: 'Lurigancho' },
    { code: '150119', name: 'Lurín' },          { code: '150120', name: 'Magdalena del Mar' },
    { code: '150121', name: 'Miraflores' },     { code: '150122', name: 'Pachacamac' },
    { code: '150123', name: 'Pucusana' },       { code: '150124', name: 'Pueblo Libre' },
    { code: '150125', name: 'Puente Piedra' },  { code: '150126', name: 'Punta Hermosa' },
    { code: '150127', name: 'Punta Negra' },    { code: '150128', name: 'Rímac' },
    { code: '150129', name: 'San Bartolo' },    { code: '150130', name: 'San Borja' },
    { code: '150131', name: 'San Isidro' },     { code: '150132', name: 'San Juan de Lurigancho' },
    { code: '150133', name: 'San Juan de Miraflores' }, { code: '150134', name: 'San Luis' },
    { code: '150135', name: 'San Martín de Porres' },   { code: '150136', name: 'San Miguel' },
    { code: '150137', name: 'Santa Anita' },    { code: '150138', name: 'Santa María del Mar' },
    { code: '150139', name: 'Santa Rosa' },     { code: '150140', name: 'Santiago de Surco' },
    { code: '150141', name: 'Surquillo' },      { code: '150142', name: 'Villa El Salvador' },
    { code: '150143', name: 'Villa María del Triunfo' }
];

// ─── Función principal ────────────────────────────────────────────────────────

const seedPaises = async (systemUserId) => {
    const withAudit = (data) => ({ ...data, user_create: systemUserId, user_update: systemUserId });

    // 1. Países ────────────────────────────────────────────────────────────
    console.log('\n🌍 Creando países...');
    for (const paisData of paisesIniciales) {
        const [pais, created] = await Country.findOrCreate({
            where: { iso_country: paisData.iso_country },
            defaults: withAudit(paisData)
        });
        console.log(`   ${created ? '✅' : 'ℹ️ '} ${pais.country}`);
    }

    // 2. Obtener Perú para referenciar country_id ──────────────────────────
    const peru = await Country.findOne({ where: { iso_country: 'PE' } });
    if (!peru) {
        console.warn('   ⚠️  No se encontró Perú, saltando ubigeo');
        return;
    }

    // 3. Departamentos (nivel 1) ───────────────────────────────────────────
    console.log('\n🏛️  Creando departamentos (nivel 1)...');
    const deptMap = {}; // dept_code → ubigeo_id

    for (const d of departamentosData) {
        const [rec, created] = await Ubigeo.findOrCreate({
            where: { code: d.code, level: 1, country_id: peru.country_id },
            defaults: { ...d, level: 1, country_id: peru.country_id, parent_id: null }
        });
        // Guardar ubigeo_id para referenciar como parent_id en provincias
        deptMap[d.code] = rec.ubigeo_id;
        console.log(`   ${created ? '✅' : 'ℹ️ '} ${rec.name}`);
    }

    // 4. Provincias de Lima (nivel 2) ─────────────────────────────────────
    console.log('\n🏘️  Creando provincias de Lima (nivel 2)...');
    const limaId = deptMap['15']; // parent_id = Lima departamento
    const provMap = {}; // prov_code(4) → ubigeo_id

    for (const p of provinciasLimaData) {
        const [rec, created] = await Ubigeo.findOrCreate({
            where: { code: p.code, level: 2, country_id: peru.country_id },
            defaults: { ...p, level: 2, country_id: peru.country_id, parent_id: limaId }
        });
        // Guardar ubigeo_id para referenciar como parent_id en distritos
        provMap[p.code] = rec.ubigeo_id;
        console.log(`   ${created ? '✅' : 'ℹ️ '} ${rec.name}`);
    }

    // 5. Distritos de la provincia Lima (nivel 3) ─────────────────────────
    console.log('\n🏠 Creando distritos de Lima (nivel 3)...');
    const limaProvId = provMap['1501']; // parent_id = Provincia Lima

    for (const d of distritosLimaData) {
        const [rec, created] = await Ubigeo.findOrCreate({
            where: { code: d.code, level: 3, country_id: peru.country_id },
            defaults: { ...d, level: 3, country_id: peru.country_id, parent_id: limaProvId }
        });
        console.log(`   ${created ? '✅' : 'ℹ️ '} ${rec.name}`);
    }

    console.log('\n✅ Seed de países y ubigeo completado.\n');
};

module.exports = { seedPaises };
