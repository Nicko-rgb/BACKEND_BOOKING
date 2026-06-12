'use strict';

const { DataTypes } = require('sequelize');

/** Agrega billing_period y mp_payment_id a la tabla de suscripciones SaaS */
module.exports = {
    up: async (queryInterface) => {
        await queryInterface.addColumn('dsg_bss_saas_subscriptions', 'billing_period', {
            type:      DataTypes.STRING(10),
            allowNull: true,
            after:     'plan_id'
        });
        await queryInterface.addColumn('dsg_bss_saas_subscriptions', 'mp_payment_id', {
            type:      DataTypes.STRING(100),
            allowNull: true,
            after:     'gateway'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeColumn('dsg_bss_saas_subscriptions', 'billing_period');
        await queryInterface.removeColumn('dsg_bss_saas_subscriptions', 'mp_payment_id');
    }
};
