/**
 * Migración: Agrega created_at y updated_at a dsg_bss_rating
 * La tabla existía antes del sistema de migraciones sin estas columnas.
 */

const COLUMNS = ['created_at', 'updated_at'];

module.exports = {
    meta: {
        description: 'Add timestamps to dsg_bss_rating',
        module: 'facility',
    },

    async up(queryInterface, sequelize, transaction) {
        for (const col of COLUMNS) {
            const [rows] = await sequelize.query(
                `SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name   = 'dsg_bss_rating'
                   AND column_name  = :col`,
                { replacements: { col }, transaction }
            );

            if (rows.length > 0) {
                console.log(`  ⏭️  ${col} ya existe en dsg_bss_rating — skipping`);
                continue;
            }

            await sequelize.query(
                `ALTER TABLE "dsg_bss_rating"
                 ADD COLUMN "${col}" TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
                { transaction }
            );
            console.log(`  ✅ ${col} agregado a dsg_bss_rating`);
        }
    },

    async down(queryInterface, sequelize, transaction) {
        for (const col of COLUMNS) {
            await sequelize.query(
                `ALTER TABLE "dsg_bss_rating" DROP COLUMN IF EXISTS "${col}"`,
                { transaction }
            );
        }
    },
};
