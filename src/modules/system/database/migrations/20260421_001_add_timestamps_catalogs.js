/**
 * Agrega created_at / updated_at a las tablas de catálogos que carecen de ellas.
 * Seguro para producción: usa ADD COLUMN IF NOT EXISTS con DEFAULT, y rellena
 * NULLs antes de imponer NOT NULL en columnas ya existentes.
 */

const TABLES = [
    'dsg_bss_ubigeo',
    'dsg_bss_department',
    'dsg_bss_province',
    'dsg_bss_district',
    'dsg_bss_sport_category',
    'dsg_bss_sport_type',
    'dsg_bss_surface_type',
    'dsg_bss_permissions',
    'dsg_bss_menu_items',
];

module.exports = {
    meta: {
        description: 'Add created_at / updated_at NOT NULL to catalog tables',
        module: 'catalogs'
    },

    async up(_queryInterface, sequelize) {
        for (const table of TABLES) {
            await addTimestamps(sequelize, table);
        }
    },

    // No se revierten — eliminar timestamps de producción no es seguro ──────────
    async down() {}
};

/**
 * Garantiza que la tabla tenga created_at y updated_at NOT NULL con DEFAULT NOW().
 * - Si la columna no existe: ADD COLUMN IF NOT EXISTS la crea y rellena todo en un paso.
 * - Si ya existe pero es nullable: rellena NULLs y luego impone NOT NULL.
 */
async function addTimestamps(sequelize, table) {
    for (const col of ['created_at', 'updated_at']) {
        const exists = await columnExists(sequelize, table, col);

        if (!exists) {
            // ADD COLUMN con NOT NULL + DEFAULT: PostgreSQL rellena filas existentes
            // con el DEFAULT antes de aplicar la restricción — nunca falla por NULLs ──
            await sequelize.query(
                `ALTER TABLE "${table}"
                 ADD COLUMN IF NOT EXISTS ${col} TIMESTAMPTZ NOT NULL DEFAULT NOW()`
            );
            console.log(`    ✅  ${table}.${col} agregado`);
        } else {
            // La columna existe: rellenar NULLs históricos y luego asegurar NOT NULL ──
            await sequelize.query(
                `UPDATE "${table}" SET ${col} = NOW() WHERE ${col} IS NULL`
            );
            await sequelize.query(
                `ALTER TABLE "${table}" ALTER COLUMN ${col} SET DEFAULT NOW()`
            );
            await sequelize.query(
                `ALTER TABLE "${table}" ALTER COLUMN ${col} SET NOT NULL`
            );
            console.log(`    ✅  ${table}.${col} asegurado NOT NULL`);
        }
    }
}

/** Devuelve true si la columna existe en la tabla (schema public). */
async function columnExists(sequelize, table, column) {
    const [rows] = await sequelize.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = :table
          AND column_name  = :column
    `, { replacements: { table, column } });
    return rows.length > 0;
}
