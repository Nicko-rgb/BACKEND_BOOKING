/**
 * Migración: Eliminar columnas camelCase ("createdAt"/"updatedAt") fantasma
 * en TODAS las tablas del sistema dsg_bss_*.
 *
 * Problema: las tablas fueron creadas inicialmente por sequelize.sync(),
 * que genera columnas "createdAt"/"updatedAt" (camelCase). Los modelos usan
 * createdAt:'created_at' / updatedAt:'updated_at', por lo que Sequelize escribe
 * en las columnas snake_case y deja las camelCase como NULL, provocando
 * "null value in column \"updatedAt\" violates not-null constraint".
 *
 * Solución: para cada tabla, si la columna snake_case ya existe, eliminar la
 *           camelCase. Si no existe, renombrar la camelCase a snake_case.
 *
 * Nota: dsg_bss_ratings ya fue corregida en 20260507_001_fix_camelcase_timestamps_ratings.js
 *       pero se incluye aquí de forma segura (el columnExists la saltará si ya no tiene camelCase).
 */

const ALL_TABLES = [
    // ── booking ──────────────────────────────────────────────────────────────
    'dsg_bss_booking',
    'dsg_bss_booking_hold',
    'dsg_bss_payment_booking',
    // ── catalogs ─────────────────────────────────────────────────────────────
    'dsg_bss_country',
    'dsg_bss_ubigeo',
    'dsg_bss_department',
    'dsg_bss_province',
    'dsg_bss_district',
    'dsg_bss_sport_category',
    'dsg_bss_sport_type',
    'dsg_bss_surface_type',
    'dsg_bss_payment_types',
    'dsg_bss_permissions',
    'dsg_bss_menu_items',
    // ── facility ─────────────────────────────────────────────────────────────
    'dsg_bss_company',
    'dsg_bss_space',
    'dsg_bss_business_hour',
    'dsg_bss_configuration',
    'dsg_bss_configuration_payment',
    'dsg_bss_payment_account',
    'dsg_bss_ratings',
    // ── media ────────────────────────────────────────────────────────────────
    'dsg_bss_media',
    // ── notification ─────────────────────────────────────────────────────────
    'dsg_bss_notification',
    // ── users ────────────────────────────────────────────────────────────────
    'dsg_bss_user',
    'dsg_bss_person',
    'dsg_bss_user_company',
    'dsg_bss_user_favorites',
    'dsg_bss_user_permissions',
];

async function tableExists(sequelize, table, transaction) {
    const [rows] = await sequelize.query(
        `SELECT to_regclass('public.${table}') IS NOT NULL AS exists`,
        { transaction }
    );
    return rows[0].exists;
}

async function columnExists(sequelize, table, column, transaction) {
    const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name   = '${table}'
           AND column_name  = '${column}'`,
        { transaction }
    );
    return rows.length > 0;
}

module.exports = {
    meta: {
        description: 'Fix camelCase timestamp columns in ALL dsg_bss_* tables',
        module: 'booking',   // Registrado en booking pero aplica globalmente
    },

    async up(queryInterface, sequelize, transaction) {
        let fixedCount = 0;

        for (const TABLE of ALL_TABLES) {
            // Saltar si la tabla no existe (ej: tabla de un módulo que no se desplegó)
            if (!(await tableExists(sequelize, TABLE, transaction))) {
                console.log(`  ⏭️  ${TABLE} no existe — skipping`);
                continue;
            }

            let tableHadIssue = false;

            // ── "createdAt" → "created_at" ────────────────────────────────────
            const hasCreatedAtCamel = await columnExists(sequelize, TABLE, 'createdAt', transaction);
            const hasCreatedAtSnake = await columnExists(sequelize, TABLE, 'created_at', transaction);

            if (hasCreatedAtCamel && hasCreatedAtSnake) {
                // Copiar datos de la camelCase a la snake_case si la snake está vacía
                await sequelize.query(
                    `UPDATE "${TABLE}" SET "created_at" = "createdAt" WHERE "created_at" IS NULL AND "createdAt" IS NOT NULL`,
                    { transaction }
                );
                await sequelize.query(`ALTER TABLE "${TABLE}" DROP COLUMN "createdAt"`, { transaction });
                console.log(`  ✅ ${TABLE}."createdAt" eliminada (ya existe "created_at")`);
                tableHadIssue = true;
            } else if (hasCreatedAtCamel && !hasCreatedAtSnake) {
                await sequelize.query(`ALTER TABLE "${TABLE}" RENAME COLUMN "createdAt" TO "created_at"`, { transaction });
                console.log(`  ✅ ${TABLE}."createdAt" renombrada a "created_at"`);
                tableHadIssue = true;
            }

            // ── "updatedAt" → "updated_at" ────────────────────────────────────
            const hasUpdatedAtCamel = await columnExists(sequelize, TABLE, 'updatedAt', transaction);
            const hasUpdatedAtSnake = await columnExists(sequelize, TABLE, 'updated_at', transaction);

            if (hasUpdatedAtCamel && hasUpdatedAtSnake) {
                await sequelize.query(
                    `UPDATE "${TABLE}" SET "updated_at" = "updatedAt" WHERE "updated_at" IS NULL AND "updatedAt" IS NOT NULL`,
                    { transaction }
                );
                await sequelize.query(`ALTER TABLE "${TABLE}" DROP COLUMN "updatedAt"`, { transaction });
                console.log(`  ✅ ${TABLE}."updatedAt" eliminada (ya existe "updated_at")`);
                tableHadIssue = true;
            } else if (hasUpdatedAtCamel && !hasUpdatedAtSnake) {
                await sequelize.query(`ALTER TABLE "${TABLE}" RENAME COLUMN "updatedAt" TO "updated_at"`, { transaction });
                console.log(`  ✅ ${TABLE}."updatedAt" renombrada a "updated_at"`);
                tableHadIssue = true;
            }

            // ── Asegurar que ambas columnas sean NOT NULL con DEFAULT NOW() ────
            if (hasCreatedAtSnake || hasCreatedAtCamel) {
                await sequelize.query(
                    `UPDATE "${TABLE}" SET "created_at" = NOW() WHERE "created_at" IS NULL`,
                    { transaction }
                );
                await sequelize.query(
                    `ALTER TABLE "${TABLE}" ALTER COLUMN "created_at" SET DEFAULT NOW()`,
                    { transaction }
                );
                await sequelize.query(
                    `ALTER TABLE "${TABLE}" ALTER COLUMN "created_at" SET NOT NULL`,
                    { transaction }
                );
            }
            if (hasUpdatedAtSnake || hasUpdatedAtCamel) {
                await sequelize.query(
                    `UPDATE "${TABLE}" SET "updated_at" = NOW() WHERE "updated_at" IS NULL`,
                    { transaction }
                );
                await sequelize.query(
                    `ALTER TABLE "${TABLE}" ALTER COLUMN "updated_at" SET DEFAULT NOW()`,
                    { transaction }
                );
                await sequelize.query(
                    `ALTER TABLE "${TABLE}" ALTER COLUMN "updated_at" SET NOT NULL`,
                    { transaction }
                );
            }

            if (tableHadIssue) fixedCount++;
            else console.log(`  ⏭️  ${TABLE} — sin columnas camelCase`);
        }

        console.log(`\n  📊 Resumen: ${fixedCount} tabla(s) corregida(s) de ${ALL_TABLES.length} verificadas`);
    },

    async down(queryInterface, sequelize, transaction) {
        // No es seguro revertir — dejaríamos columnas camelCase con NOT NULL que
        // romperían los INSERTs de Sequelize. Solo documentamos la posibilidad.
        console.log('  ⚠️  Rollback de fix_camelcase_timestamps no aplica (sería destructivo)');
    },
};
