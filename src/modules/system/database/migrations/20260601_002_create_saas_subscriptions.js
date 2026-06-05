const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable('dsg_bss_saas_subscriptions', {
            subscription_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            company_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                comment: 'ID del Tenant (Empresa Padre donde parent_company_id es null)',
                references: {
                    model: 'dsg_bss_company',
                    key: 'company_id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            plan_id: {
                type: DataTypes.BIGINT,
                allowNull: false,
                references: {
                    model: 'dsg_bss_saas_plans',
                    key: 'plan_id'
                },
                onUpdate: 'CASCADE'
            },
            status: {
                type: DataTypes.STRING(30),
                allowNull: false,
                defaultValue: 'TRIAL',
                comment: 'TRIAL, ACTIVE, PAST_DUE, CANCELED, INCOMPLETE'
            },
            stripe_customer_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'ID del cliente en Stripe'
            },
            stripe_subscription_id: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'ID de la suscripción en Stripe Billing'
            },
            current_period_start: {
                type: DataTypes.DATE,
                allowNull: true
            },
            current_period_end: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Fecha de vencimiento del mes/año pagado'
            },
            cancel_at_period_end: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Si el usuario canceló, pero puede usarlo hasta fin de mes'
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        });

        // Crear índice para búsquedas rápidas por Tenant
        await queryInterface.addIndex('dsg_bss_saas_subscriptions', ['company_id']);
        await queryInterface.addIndex('dsg_bss_saas_subscriptions', ['stripe_subscription_id']);
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('dsg_bss_saas_subscriptions');
    }
};