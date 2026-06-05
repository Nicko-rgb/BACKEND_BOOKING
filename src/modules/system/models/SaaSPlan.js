const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../../config/db');

class SaaSPlan extends Model {
    static associate(models) {
        SaaSPlan.hasMany(models.SaaSSubscription, { foreignKey: 'plan_id', as: 'subscriptions' });
    }
}

SaaSPlan.init({
    plan_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    price_monthly: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    price_yearly: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    max_subsidiaries: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    max_spaces: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    max_users: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    has_stripe_connect: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    features: {
        type: DataTypes.JSONB,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('features');
            if (typeof rawValue === 'string') {
                try { return JSON.parse(rawValue); } 
                catch (e) { return rawValue; }
            }
            return rawValue;
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: 'SaaSPlan',
    tableName: 'dsg_bss_saas_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SaaSPlan;