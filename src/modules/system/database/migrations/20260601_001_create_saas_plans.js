const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface) => {
        await queryInterface.createTable('dsg_bss_saas_plans', {
            plan_id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false
            },
            code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
                comment: 'Código interno como BASIC, PRO, ENTERPRISE'
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
                allowNull: false,
                comment: 'Límite de sucursales. 999 para ilimitado'
            },
            max_spaces: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Límite de canchas por sucursal. 999 para ilimitado'
            },
            max_users: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Límite de empleados. 999 para ilimitado'
            },
            has_stripe_connect: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Si el plan permite procesar pagos con tarjeta'
            },
            features: {
                type: DataTypes.JSONB,
                allowNull: true,
                comment: 'Lista de características para mostrar en el frontend'
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
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
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('dsg_bss_saas_plans');
    }
};