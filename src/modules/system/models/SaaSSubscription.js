const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../../config/db');

class SaaSSubscription extends Model {
    static associate(models) {
        if (models.Company) {
            SaaSSubscription.belongsTo(models.Company, { foreignKey: 'company_id', as: 'tenant' });
        }
        if (models.SaaSPlan) {
            SaaSSubscription.belongsTo(models.SaaSPlan, { foreignKey: 'plan_id', as: 'plan' });
        }
    }

    /**
     * Helper para verificar si la suscripción está activa y no ha vencido
     */
    isValid() {
        if (this.status === 'CANCELED') return false;
        
        // Si tiene fecha de fin y ya pasó, ya no es válida (incluso si el estatus dice ACTIVE por un delay del webhook)
        if (this.current_period_end && new Date() > new Date(this.current_period_end)) {
            return false;
        }
        
        return ['TRIAL', 'ACTIVE'].includes(this.status);
    }
}

SaaSSubscription.init({
    subscription_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    company_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del Tenant (Empresa Padre donde parent_company_id es null)',
    },
    plan_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'ID del Plan de SaaS',
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
        comment: 'ID del Cliente de Stripe'
    },
    stripe_subscription_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID de la Suscripción de Stripe'
    },
    // ── MercadoPago ─────────────────────────────────────────────────────────
    gateway: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'STRIPE',
        comment: "Pasarela activa: 'STRIPE' | 'MERCADOPAGO'"
    },
    mp_preapproval_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID del Preapproval en MercadoPago'
    },
    mp_payer_email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Email del pagador registrado en MercadoPago'
    },
    current_period_start: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Fecha de inicio del mes/año pagado'
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
    }
}, {
    sequelize,
    modelName: 'SaaSSubscription',
    tableName: 'dsg_bss_saas_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SaaSSubscription;