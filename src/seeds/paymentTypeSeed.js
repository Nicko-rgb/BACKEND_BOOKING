const { PaymentType, Country } = require('../modules/catalogs/models');

/**
 * Seeder para tipos de pago en Perú
 */
async function seedPaymentTypes(systemUserId) {
    try {
        console.log('  - Poblando tipos de pago...');

        // Buscar el país Perú
        const peru = await Country.findOne({ where: { iso_country: 'PE' } });
        if (!peru) {
            console.error('  ❌ No se encontró el país Perú (PE) para asociar los tipos de pago.');
            return;
        }

        const paymentTypes = [
            {
                country_id: peru.country_id,
                name: 'Yape',
                code: 'YAPE',
                category: 'billetera_digital',
                provider: 'BCP',
                description: 'Pago mediante escaneo de código QR o número celular a través de Yape.',
                icon_url: 'https://www.yape.com.pe/favicon.ico',
                processing_time: 'Inmediato',
                is_enabled: true
            },
            {
                country_id: peru.country_id,
                name: 'Plin',
                code: 'PLIN',
                category: 'billetera_digital',
                provider: 'Interbank/BBVA/Scotiabank',
                description: 'Pago mediante escaneo de código QR o número celular a través de Plin.',
                icon_url: 'https://plin.com.pe/favicon.ico',
                processing_time: 'Inmediato',
                is_enabled: true
            },
            {
                country_id: peru.country_id,
                name: 'Transferencia Bancaria',
                code: 'BANK_TRANSFER',
                category: 'transferencia_bancaria',
                provider: 'Bancos Locales',
                description: 'Transferencia directa a cuenta bancaria (BCP, BBVA, Interbank, etc.).',
                icon_url: null,
                processing_time: '1-24 horas',
                is_enabled: true
            },
            {
                country_id: peru.country_id,
                name: 'Efectivo',
                code: 'CASH',
                category: 'efectivo',
                provider: 'Local',
                description: 'Pago presencial en la sucursal.',
                icon_url: null,
                processing_time: 'Inmediato',
                is_enabled: true
            },
            {
                country_id: peru.country_id,
                name: 'Tarjeta de Crédito/Débito',
                code: 'CARD_ONLINE',
                category: 'tarjeta_credito',
                provider: 'Mercado Pago / Niubiz',
                description: 'Pago en línea con tarjeta Visa, Mastercard, AMEX, etc.',
                icon_url: null,
                processing_time: 'Inmediato',
                is_enabled: true,
                commission_percentage: 0.0399, // Ejemplo 3.99%
                fixed_commission: 1.00 // S/ 1.00 fijo
            }
        ];

        for (const pt of paymentTypes) {
            await PaymentType.findOrCreate({
                where: { country_id: pt.country_id, code: pt.code },
                defaults: pt
            });
        }

        console.log('  ✅ Tipos de pago para Perú poblados exitosamente.');
    } catch (error) {
        console.error('  ❌ Error al poblar tipos de pago:', error);
        throw error;
    }
}

module.exports = { seedPaymentTypes };
