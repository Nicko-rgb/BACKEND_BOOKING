/**
 * Corrección: agrega created_at y updated_at a dsg_bss_ratings (con 's').
 * La migración anterior apuntaba a dsg_bss_rating (sin 's') — nombre incorrecto.
 */

const TABLE = 'dsg_bss_ratings';
const COLUMNS = ['created_at', 'updated_at'];

module.exports = {
    meta: {
        description: 'Fix: add timestamps to dsg_bss_ratings (correct table name)',
        module: 'facility',
    },

    async up(queryInterface, sequelize, transaction) {
        // Verificar que la tabla existe antes de alterar ──────────────────────
        const [tableRows] = await sequelize.query(
            `SELECT to_regclass('public.${TABLE}') IS NOT NULL AS exists`,
            { transaction }
        );

        if (!tableRows[0].exists) {
            console.log(`  ⏭️  ${TABLE} no existe — skipping`);
            return;
        }

        for (const col of COLUMNS) {
            const [rows] = await sequelize.query(
                `SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name   = '${TABLE}'
                   AND column_name  = :col`,
                { replacements: { col }, transaction }
            );

            if (rows.length > 0) {
                console.log(`  ⏭️  ${col} ya existe en ${TABLE} — skipping`);
                continue;
            }

            await sequelize.query(
                `ALTER TABLE "${TABLE}" ADD COLUMN "${col}" TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
                { transaction }
            );
            console.log(`  ✅ ${col} agregado a ${TABLE}`);
        }
    },

    async down(queryInterface, sequelize, transaction) {
        for (const col of COLUMNS) {
            await sequelize.query(
                `ALTER TABLE "${TABLE}" DROP COLUMN IF EXISTS "${col}"`,
                { transaction }
            );
        }
    },
};
