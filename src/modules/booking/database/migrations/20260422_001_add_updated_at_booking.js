/**
 * Migración: Agrega updated_at a dsg_bss_booking
 * La tabla existía antes del sistema de migraciones y nunca tuvo esta columna.
 */

module.exports = {
    meta: {
        description: 'Add updated_at to dsg_bss_booking',
        module: 'booking',
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows] = await sequelize.query(
            `SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name   = 'dsg_bss_booking'
               AND column_name  = 'updated_at'`,
            { transaction }
        );

        if (rows.length > 0) {
            console.log('  ⏭️  updated_at ya existe en dsg_bss_booking — skipping');
            return;
        }

        await sequelize.query(
            `ALTER TABLE "dsg_bss_booking"
             ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
            { transaction }
        );
        console.log('  ✅ updated_at agregado a dsg_bss_booking');
    },

    async down(queryInterface, sequelize, transaction) {
        await sequelize.query(
            `ALTER TABLE "dsg_bss_booking" DROP COLUMN IF EXISTS "updated_at"`,
            { transaction }
        );
    },
};
