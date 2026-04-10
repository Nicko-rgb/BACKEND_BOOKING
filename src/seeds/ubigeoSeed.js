/**
 * ubigeoSeed.js
 * Carga el ubigeo completo de Perú (departamentos, provincias y distritos)
 * desde el archivo ubigeo.sql hacia la tabla dsg_bss_ubigeo vía Sequelize.
 *
 * Estrategia:
 *  - Parsea los INSERT del .sql sin ejecutar SQL nativo (independiente de motor).
 *  - Inserta por niveles en orden: dept → prov → dist para poder encadenar parent_id.
 *  - Usa bulkCreate por nivel para eficiencia (evita N queries individuales).
 *  - Idempotente: si ya existen registros de Perú en ubigeo, no hace nada.
 */

const fs   = require('fs');
const path = require('path');
const Ubigeo  = require('../modules/catalogs/models/Ubigeo');
const { Country } = require('../modules/catalogs/models');

// Tamaño de lote para insertar distritos (evitar payloads enormes) ─────────────
const BATCH_SIZE = 500;

/**
 * Extrae filas de TODOS los bloques INSERT de una tabla procesando línea por línea.
 * Un dump MySQL puede generar múltiples INSERT INTO para la misma tabla
 * (ubigeo_peru_districts aparece en dos bloques separados por ';').
 * Itera todos los bloques hasta agotar el archivo.
 * Procesa línea por línea para manejar correctamente nombres con paréntesis
 * internos como 'Quisqui (Kichki)' sin que rompan el parser de tuplas.
 *
 * @param {string} sqlContent - Contenido completo del archivo .sql
 * @param {string} tableName  - Nombre de la tabla MySQL (sin backticks)
 * @returns {Array<string[]>} - Array de filas; cada fila es un array de strings (o null)
 */
function parseSqlTable(sqlContent, tableName) {
    const insertMarker = `INSERT INTO \`${tableName}\``;
    const rows         = [];
    let   searchFrom   = 0;

    // Iterar sobre todos los bloques INSERT de esta tabla ────────────────────────
    while (true) {
        const insertIdx = sqlContent.indexOf(insertMarker, searchFrom);
        if (insertIdx === -1) break;

        const valuesIdx = sqlContent.indexOf('VALUES', insertIdx);
        if (valuesIdx === -1) break;

        // Cada bloque INSERT termina en ';' ─────────────────────────────────────
        const endIdx      = sqlContent.indexOf(';', valuesIdx);
        const valuesBlock = sqlContent.substring(valuesIdx + 6, endIdx);

        // Procesar línea por línea — cada fila de datos empieza con '(' ─────────
        for (const line of valuesBlock.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('(')) continue;

            // Quitar el '(' inicial y la ',' o ')' final ─────────────────────
            const inner = trimmed.replace(/^\(/, '').replace(/[),;]*$/, '');

            const values   = [];
            // Extraer cada valor entre comillas simples o NULL ────────────────
            const valRegex = /'([^']*)'|NULL/g;
            let valMatch;
            while ((valMatch = valRegex.exec(inner)) !== null) {
                // valMatch[1] definido → string entre comillas; undefined → NULL
                values.push(valMatch[1] !== undefined ? valMatch[1] : null);
            }

            if (values.length > 0) rows.push(values);
        }

        // Avanzar pasado este bloque para buscar el siguiente ────────────────────
        searchFrom = endIdx + 1;
    }

    return rows;
}

/**
 * Inserta lotes de registros usando bulkCreate.
 * Divide el array en chunks de BATCH_SIZE para no saturar la conexión.
 *
 * @param {object[]} records - Registros a insertar
 */
async function bulkInsertBatched(records) {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        await Ubigeo.bulkCreate(records.slice(i, i + BATCH_SIZE));
    }
}

/**
 * Seed principal de ubigeo Perú.
 * Carga los 3 niveles geográficos completos desde ubigeo.sql.
 * No recibe systemUserId porque Ubigeo no tiene campos de auditoría.
 */
const seedUbigeo = async () => {
    // 1. Verificar que Perú exista ─────────────────────────────────────────────
    const peru = await Country.findOne({ where: { iso_country: 'PE' } });
    if (!peru) {
        console.warn('   ⚠️  Perú no encontrado en Country, saltando ubigeo');
        return;
    }

    // 2. Guard de idempotencia — si ya hay registros no cargar de nuevo ─────────
    const existingCount = await Ubigeo.count({ where: { country_id: peru.country_id } });
    if (existingCount > 0) {
        console.log(`   ℹ️  Ubigeo Perú ya cargado (${existingCount} registros), saltando`);
        return;
    }

    // 3. Leer y parsear el archivo SQL ─────────────────────────────────────────
    const sqlPath    = path.join(__dirname, 'ubigeo.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    const rawDepts = parseSqlTable(sqlContent, 'ubigeo_peru_departments'); // [id, name]
    const rawProvs = parseSqlTable(sqlContent, 'ubigeo_peru_provinces');   // [id, name, dept_id]
    const rawDists = parseSqlTable(sqlContent, 'ubigeo_peru_districts');    // [id, name, prov_id, dept_id]

    // 4. Insertar departamentos (nivel 1) ─────────────────────────────────────
    console.log(`\n🏛️  Insertando ${rawDepts.length} departamentos...`);
    await bulkInsertBatched(
        rawDepts.map(([id, name]) => ({
            code:       id,
            name,
            level:      1,
            country_id: peru.country_id,
            parent_id:  null
        }))
    );

    // 5. Cargar departamentos para obtener sus ubigeo_id (parent de provincias) ─
    const deptRecords = await Ubigeo.findAll({
        where:      { country_id: peru.country_id, level: 1 },
        attributes: ['ubigeo_id', 'code']
    });
    // Map: code(2) → ubigeo_id ────────────────────────────────────────────────
    const deptMap = Object.fromEntries(deptRecords.map(d => [d.code, d.ubigeo_id]));

    // 6. Insertar provincias (nivel 2) ────────────────────────────────────────
    console.log(`\n🏘️  Insertando ${rawProvs.length} provincias...`);
    await bulkInsertBatched(
        rawProvs.map(([id, name, deptId]) => ({
            code:       id,
            name,
            level:      2,
            country_id: peru.country_id,
            parent_id:  deptMap[deptId] ?? null
        }))
    );

    // 7. Cargar provincias para obtener sus ubigeo_id (parent de distritos) ────
    const provRecords = await Ubigeo.findAll({
        where:      { country_id: peru.country_id, level: 2 },
        attributes: ['ubigeo_id', 'code']
    });
    // Map: code(4) → ubigeo_id ────────────────────────────────────────────────
    const provMap = Object.fromEntries(provRecords.map(p => [p.code, p.ubigeo_id]));

    // 8. Insertar distritos (nivel 3) en lotes ────────────────────────────────
    console.log(`\n🏠 Insertando ${rawDists.length} distritos en lotes de ${BATCH_SIZE}...`);
    await bulkInsertBatched(
        rawDists.map(([id, name, provId]) => ({
            code:       id,
            name,
            level:      3,
            country_id: peru.country_id,
            parent_id:  provMap[provId] ?? null
        }))
    );

    console.log('\n✅ Ubigeo Perú cargado completamente.\n');
};

module.exports = { seedUbigeo };
