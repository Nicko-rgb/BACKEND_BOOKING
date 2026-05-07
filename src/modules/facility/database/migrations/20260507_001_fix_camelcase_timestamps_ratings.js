/**
 * Corrección producción: renombra columnas camelCase a snake_case en dsg_bss_ratings.
 *
 * En producción la tabla fue creada por Sequelize.sync() antes de las migraciones,
 * lo que generó columnas "createdAt"/"updatedAt" (camelCase). El modelo usa
 * createdAt:'created_at' / updatedAt:'updated_at', por lo que al hacer INSERT
 * Sequelize no provee valor para "createdAt", violando su NOT NULL constraint.
 *
 * Este script renombra las columnas camelCase a snake_case cuando existen.
 */

const TABLE = 'dsg_bss_ratings';

/** Verifica si una columna existe en la tabla. */
const columnExists = async (sequelize, table, column) => {
    const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name   = :table
            AND column_name  = :column`,
        { replacements: { table, column } }
    );
    return rows.length > 0;
};

module.exports = {
    meta: {
        description: 'Fix: rename camelCase timestamps to snake_case in dsg_bss_ratings',
        module: 'facility',
    },

    async up(queryInterface, sequelize) {
        // ── "createdAt" → "created_at" ────────────────────────────────────────
        const hasCreatedAtCamel  = await columnExists(sequelize, TABLE, 'createdAt');
        const hasCreatedAtSnake  = await columnExists(sequelize, TABLE, 'created_at');

        if (hasCreatedAtCamel && hasCreatedAtSnake) {
            // Ambas existen: la snake_case ya fue agregada por la migración anterior
            // → solo eliminar la camelCase que causa la constraint violation
            await sequelize.query(`ALTER TABLE "${TABLE}" DROP COLUMN "createdAt"`);
            console.log(`  ✅ "createdAt" eliminada (ya existe "created_at")`);
        } else if (hasCreatedAtCamel) {
            // Solo existe la camelCase: renombrar y asegurar DEFAULT
            await sequelize.query(`ALTER TABLE "${TABLE}" RENAME COLUMN "createdAt" TO "created_at"`);
            await sequelize.query(`ALTER TABLE "${TABLE}" ALTER COLUMN "created_at" SET DEFAULT NOW()`);
            console.log(`  ✅ "createdAt" renombrada a "created_at"`);
        } else {
            console.log(`  ⏭️  "createdAt" no existe en ${TABLE} — skipping`);
        }

        // ── "updatedAt" → "updated_at" ────────────────────────────────────────
        const hasUpdatedAtCamel  = await columnExists(sequelize, TABLE, 'updatedAt');
        const hasUpdatedAtSnake  = await columnExists(sequelize, TABLE, 'updated_at');

        if (hasUpdatedAtCamel && hasUpdatedAtSnake) {
            await sequelize.query(`ALTER TABLE "${TABLE}" DROP COLUMN "updatedAt"`);
            console.log(`  ✅ "updatedAt" eliminada (ya existe "updated_at")`);
        } else if (hasUpdatedAtCamel) {
            await sequelize.query(`ALTER TABLE "${TABLE}" RENAME COLUMN "updatedAt" TO "updated_at"`);
            console.log(`  ✅ "updatedAt" renombrada a "updated_at"`);
        } else {
            console.log(`  ⏭️  "updatedAt" no existe en ${TABLE} — skipping`);
        }
    },

    async down(queryInterface, sequelize) {
        // Revertir: snake_case → camelCase (solo si no existe la camelCase ya)
        const hasCreatedAtSnake = await columnExists(sequelize, TABLE, 'created_at');
        if (hasCreatedAtSnake) {
            await sequelize.query(`ALTER TABLE "${TABLE}" RENAME COLUMN "created_at" TO "createdAt"`);
        }

        const hasUpdatedAtSnake = await columnExists(sequelize, TABLE, 'updated_at');
        if (hasUpdatedAtSnake) {
            await sequelize.query(`ALTER TABLE "${TABLE}" RENAME COLUMN "updated_at" TO "updatedAt"`);
        }
    },
};
