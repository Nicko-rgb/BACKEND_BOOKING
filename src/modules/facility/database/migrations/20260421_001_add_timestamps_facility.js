/**
 * Agrega created_at / updated_at NOT NULL a dsg_bss_user_favorites.
 * Seguro para producción: ADD COLUMN IF NOT EXISTS con DEFAULT rellena filas existentes.
 */

const TABLES = [
    'dsg_bss_user_favorites',
];

module.exports = {
    meta: {
        description: 'Add created_at / updated_at NOT NULL to facility junction tables',
        module: 'facility'
    },

    async up(_queryInterface, sequelize) {
        for (const table of TABLES) {
            await addTimestamps(sequelize, table);
        }
    },

    async down() {}
};

async function addTimestamps(sequelize, table) {
    for (const col of ['created_at', 'updated_at']) {
        const exists = await columnExists(sequelize, table, col);

        if (!exists) {
            await sequelize.query(
                `ALTER TABLE "${table}"
                 ADD COLUMN IF NOT EXISTS ${col} TIMESTAMPTZ NOT NULL DEFAULT NOW()`
            );
            console.log(`    ✅  ${table}.${col} agregado`);
        } else {
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

async function columnExists(sequelize, table, column) {
    const [rows] = await sequelize.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = :table
          AND column_name  = :column
    `, { replacements: { table, column } });
    return rows.length > 0;
}
