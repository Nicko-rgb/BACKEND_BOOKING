/**
 * Seeder: ubigeo completo de Perú (departamentos, provincias, distritos)
 * Carga desde ubigeo.sql y parsea los INSERT sin ejecutar SQL nativo.
 */
const fs   = require('fs');
const path = require('path');
const Ubigeo  = require('../../models/Ubigeo');
const { Country } = require('../../models');

// Tamaño de lote para insertar distritos ──────────────────────────────────────
const BATCH_SIZE = 500;

/**
 * Extrae filas de TODOS los bloques INSERT de una tabla procesando línea por línea.
 * @param {string} sqlContent - Contenido completo del archivo .sql
 * @param {string} tableName  - Nombre de la tabla MySQL (sin backticks)
 * @returns {Array<string[]>}
 */
function parseSqlTable(sqlContent, tableName) {
    const insertMarker = `INSERT INTO \`${tableName}\``;
    const rows         = [];
    let   searchFrom   = 0;

    while (true) {
        const insertIdx = sqlContent.indexOf(insertMarker, searchFrom);
        if (insertIdx === -1) break;

        const valuesIdx = sqlContent.indexOf('VALUES', insertIdx);
        if (valuesIdx === -1) break;

        const endIdx      = sqlContent.indexOf(';', valuesIdx);
        const valuesBlock = sqlContent.substring(valuesIdx + 6, endIdx);

        for (const line of valuesBlock.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('(')) continue;

            const inner = trimmed.replace(/^\(/, '').replace(/[),;]*$/, '');
            const values   = [];
            const valRegex = /'([^']*)'|NULL/g;
            let valMatch;
            while ((valMatch = valRegex.exec(inner)) !== null) {
                values.push(valMatch[1] !== undefined ? valMatch[1] : null);
            }

            if (values.length > 0) rows.push(values);
        }

        searchFrom = endIdx + 1;
    }

    return rows;
}

/**
 * Inserta lotes de registros usando bulkCreate.
 * @param {object[]} records
 */
async function bulkInsertBatched(records) {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        await Ubigeo.bulkCreate(records.slice(i, i + BATCH_SIZE));
    }
}

// Función del seed ────────────────────────────────────────────────────────────
const seedFn = async () => {
    // Verificar que Perú exista ────────────────────────────────────────────────
    const peru = await Country.findOne({ where: { iso_country: 'PE' } });
    if (!peru) {
        console.warn('   ⚠️  Perú no encontrado en Country, saltando ubigeo');
        return;
    }

    // Guard de idempotencia ───────────────────────────────────────────────────
    const existingCount = await Ubigeo.count({ where: { country_id: peru.country_id } });
    if (existingCount > 0) {
        console.log(`   ℹ️  Ubigeo Perú ya cargado (${existingCount} registros), saltando`);
        return;
    }

    // Leer y parsear el archivo SQL ───────────────────────────────────────────
    const sqlPath    = path.join(__dirname, 'ubigeo.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    const rawDepts = parseSqlTable(sqlContent, 'ubigeo_peru_departments');
    const rawProvs = parseSqlTable(sqlContent, 'ubigeo_peru_provinces');
    const rawDists = parseSqlTable(sqlContent, 'ubigeo_peru_districts');

    // Insertar departamentos (nivel 1) ────────────────────────────────────────
    console.log(`\n🏛️  Insertando ${rawDepts.length} departamentos...`);
    await bulkInsertBatched(
        rawDepts.map(([id, name]) => ({ code: id, name, level: 1, country_id: peru.country_id, parent_id: null }))
    );

    // Cargar departamentos para parent_id de provincias ───────────────────────
    const deptRecords = await Ubigeo.findAll({ where: { country_id: peru.country_id, level: 1 }, attributes: ['ubigeo_id', 'code'] });
    const deptMap = Object.fromEntries(deptRecords.map(d => [d.code, d.ubigeo_id]));

    // Insertar provincias (nivel 2) ───────────────────────────────────────────
    console.log(`\n🏘️  Insertando ${rawProvs.length} provincias...`);
    await bulkInsertBatched(
        rawProvs.map(([id, name, deptId]) => ({ code: id, name, level: 2, country_id: peru.country_id, parent_id: deptMap[deptId] ?? null }))
    );

    // Cargar provincias para parent_id de distritos ───────────────────────────
    const provRecords = await Ubigeo.findAll({ where: { country_id: peru.country_id, level: 2 }, attributes: ['ubigeo_id', 'code'] });
    const provMap = Object.fromEntries(provRecords.map(p => [p.code, p.ubigeo_id]));

    // Insertar distritos (nivel 3) ────────────────────────────────────────────
    console.log(`\n🏠 Insertando ${rawDists.length} distritos en lotes de ${BATCH_SIZE}...`);
    await bulkInsertBatched(
        rawDists.map(([id, name, provId]) => ({ code: id, name, level: 3, country_id: peru.country_id, parent_id: provMap[provId] ?? null }))
    );

    console.log('\n✅ Ubigeo Perú cargado completamente.\n');
};

module.exports = {
    seedName: 'ubigeoSeed',
    environment: 'essential',
    dependsOnSystemUser: false,
    order: 50,
    seedFn
};
