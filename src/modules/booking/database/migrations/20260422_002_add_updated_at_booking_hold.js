/**
 * Migración: Agrega updated_at a dsg_bss_booking_hold
 * La tabla existía antes del sistema de migraciones sin esta columna.
 */

module.exports = {
    meta: {
        description: 'Add updated_at to dsg_bss_booking_hold',
        module: 'booking',
    },

    async up(queryInterface, sequelize, transaction) {
        const [rows] = await sequelize.query(
            `SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name   = 'dsg_bss_booking_hold'
               AND column_name  = 'updated_at'`,
            { transaction }
        );

        if (rows.length > 0) {
            console.log('  ⏭️  updated_at ya existe en dsg_bss_booking_hold — skipping');
            return;
        }

        await sequelize.query(
            `ALTER TABLE "dsg_bss_booking_hold"
             ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
            { transaction }
        );
        console.log('  ✅ updated_at agregado a dsg_bss_booking_hold');
    },

    async down(queryInterface, sequelize, transaction) {
        await sequelize.query(
            `ALTER TABLE "dsg_bss_booking_hold" DROP COLUMN IF EXISTS "updated_at"`,
            { transaction }
        );
    },
};
