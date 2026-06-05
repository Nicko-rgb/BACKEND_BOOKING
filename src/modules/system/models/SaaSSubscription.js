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
        allowNull: false
    },
    plan_id: {
        type: DataTypes.BIGINT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'TRIAL'
    },
    stripe_customer_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    stripe_subscription_id: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    current_period_start: {
        type: DataTypes.DATE,
        allowNull: true
    },
    current_period_end: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cancel_at_period_end: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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