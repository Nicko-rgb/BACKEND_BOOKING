const { DataTypes } = require('sequelize');

/**
 * Migración: Añade soporte MercadoPago a la tabla de suscripciones
 * y añade el valor 'P' (PENDING) al ENUM is_enabled de Company.
 *
 * El valor 'P' indica que la empresa fue creada por el flujo SaaS
 * pero aún no ha confirmado el pago — no puede operar aún.
 */
module.exports = {
    up: async (queryInterface) => {
        // 1. Añadir valor PENDING al ENUM de Company.is_enabled
        //    PostgreSQL requiere ALTER TYPE para modificar ENUMs existentes
        await queryInterface.sequelize.query(
            `ALTER TYPE "enum_dsg_bss_company_is_enabled" ADD VALUE IF NOT EXISTS 'P';`
        );

        // 2. Añadir campos de MercadoPago a la tabla de suscripciones
        await queryInterface.addColumn('dsg_bss_saas_subscriptions', 'gateway', {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'STRIPE',
            comment: "'STRIPE' | 'MERCADOPAGO'"
        });

        await queryInterface.addColumn('dsg_bss_saas_subscriptions', 'mp_preapproval_id', {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'ID del Preapproval en MercadoPago'
        });

        await queryInterface.addColumn('dsg_bss_saas_subscriptions', 'mp_payer_email', {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Email del pagador registrado en MercadoPago'
        });

        // Índice para buscar suscripciones MP por preapproval_id (webhook)
        await queryInterface.addIndex('dsg_bss_saas_subscriptions', ['mp_preapproval_id'], {
            name: 'idx_saas_sub_mp_preapproval_id'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex('dsg_bss_saas_subscriptions', 'idx_saas_sub_mp_preapproval_id');
        await queryInterface.removeColumn('dsg_bss_saas_subscriptions', 'mp_payer_email');
        await queryInterface.removeColumn('dsg_bss_saas_subscriptions', 'mp_preapproval_id');
        await queryInterface.removeColumn('dsg_bss_saas_subscriptions', 'gateway');
        // Nota: PostgreSQL no permite eliminar valores de un ENUM — el 'P' queda en el tipo
    }
};
