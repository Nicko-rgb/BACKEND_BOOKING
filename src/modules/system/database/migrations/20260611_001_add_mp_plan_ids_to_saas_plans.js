const { DataTypes } = require('sequelize');

/**
 * Migración: Añade los IDs de planes de MercadoPago a la tabla de planes SaaS.
 *
 * Cada fila de SaaSPlan representa un plan en la BD del sistema.
 * mp_plan_id_monthly / mp_plan_id_yearly son los preapproval_plan_id que MP asigna
 * cuando se crean los "Planes de suscripción" en el dashboard de MercadoPago.
 * El servicio de checkout usará estos IDs para redirigir al usuario al checkout de MP.
 */
module.exports = {
    up: async (queryInterface) => {
        // ID del plan mensual en MercadoPago ──────────────────────────────────────────
        await queryInterface.addColumn('dsg_bss_saas_plans', 'mp_plan_id_monthly', {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'preapproval_plan_id del plan mensual en MercadoPago'
        });

        // ID del plan anual en MercadoPago ────────────────────────────────────────────
        await queryInterface.addColumn('dsg_bss_saas_plans', 'mp_plan_id_yearly', {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'preapproval_plan_id del plan anual en MercadoPago'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeColumn('dsg_bss_saas_plans', 'mp_plan_id_yearly');
        await queryInterface.removeColumn('dsg_bss_saas_plans', 'mp_plan_id_monthly');
    }
};
