/**
 * saasPlansSeed.js
 *
 * Pobla los planes SaaS iniciales en la base de datos.
 *
 * Idempotente: usa findOrCreate.
 */

const { SaaSPlan } = require('../../models');

const seedFn = async () => {
    
    const plansToSeed = [
        {
            name: 'Emprendedor',
            code: 'BASIC',
            price_monthly: 29.00,
            price_yearly: 295.00,
            max_subsidiaries: 1,
            max_spaces: 3,
            max_users: 2,
            has_stripe_connect: false,
            features: [
                'Reservas manuales ilimitadas',
                'Pagos en Efectivo, Yape, Plin',
                'Dashboard básico',
                'Soporte por email'
            ],
            is_active: true
        },
        {
            name: 'Profesional',
            code: 'PRO',
            price_monthly: 79.00,
            price_yearly: 790.00,
            max_subsidiaries: 3,
            max_spaces: 999, // Ilimitado visualmente
            max_users: 10,
            has_stripe_connect: true,
            features: [
                'Todo lo del plan Básico',
                'Pagos con Tarjeta (Stripe)',
                'Canchas ilimitadas',
                'Reportes financieros avanzados',
                'Notificaciones automáticas',
                'Soporte prioritario'
            ],
            is_active: true
        },
        {
            name: 'Corporativo',
            code: 'ENTERPRISE',
            price_monthly: 199.00,
            price_yearly: 1990.00,
            max_subsidiaries: 999, // Ilimitado visualmente
            max_spaces: 999,
            max_users: 999,
            has_stripe_connect: true,
            features: [
                'Todo lo del plan Profesional',
                'Sucursales y Empleados ilimitados',
                'Marca Blanca (White Label)',
                'Multi-Empresa bajo un solo login',
                'Account Manager 24/7'
            ],
            is_active: true
        }
    ];

    console.log('\n🌱 Iniciando seed: Creando planes SaaS base...\n');

    for (const plan of plansToSeed) {
        // En Sequelize, los features al ser JSONB se manejan directo como Array o Objeto
        const [saasPlan, created] = await SaaSPlan.findOrCreate({
            where: { code: plan.code },
            defaults: plan
        });

        if (created) {
            console.log(`  ✅ Plan SaaS creado: ${plan.name} (${plan.code})`);
        } else {
            console.log(`  ℹ️  Plan SaaS ya existe: ${plan.name}`);
            
            // Opcional: Actualizar los precios o features si ya existía
            await saasPlan.update(plan);
        }
    }

    console.log('\n🎉 Seed de planes SaaS completado.\n');
};

module.exports = {
    seedName: 'saasPlansSeed',
    environment: 'essential', // Este seed es esencial para que funcione el SaaS, no solo para demo
    dependsOnSystemUser: false,
    order: 15, // Se ejecuta en system, antes que dependencias externas
    seedFn
};