/**
 * CardOnlinePaymentStrategy - Pago con tarjeta de crédito/débito via Stripe
 *
 * Flujo con Stripe PaymentIntents (moderno):
 *  1. Frontend llama POST /bookings/payment-intent → obtiene client_secret
 *  2. Frontend confirma el pago con Stripe.js usando los datos de tarjeta
 *  3. Frontend envía POST /bookings con payment_details.payment_intent_id
 *  4. Este strategy verifica el PI con Stripe API → si succeeded → PAID, booking CONFIRMED
 *  5. Webhook en POST /bookings/webhooks/stripe actúa como respaldo de confiabilidad
 *
 * Comisión: 3.99% + S/1.00 (configurable en PaymentType.commission_percentage / fixed_commission)
 */
const BasePaymentStrategy = require('./BasePaymentStrategy');
const { BadRequestError } = require('../../../shared/errors/CustomErrors');

class CardOnlinePaymentStrategy extends BasePaymentStrategy {
    async validate(data) {
        const { payment_details } = data;

        if (!process.env.STRIPE_SECRET_KEY) {
            throw new BadRequestError('El pago con tarjeta no está disponible en este momento. Contacta al administrador.');
        }

        if (!payment_details?.payment_intent_id) {
            throw new BadRequestError(
                'Para pago con tarjeta se requiere payment_details.payment_intent_id. ' +
                'Primero llama a POST /bookings/payment-intent para obtenerlo.'
            );
        }
    }

    async process(data, createdBookings, _transaction, _sucursalConfig, paymentTypeRecord) {
        const { payment_details, total_amount, bookings: bookingsInput } = data;
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const amount = total_amount || (bookingsInput || []).reduce((s, b) => s + Number(b.total_amount), 0);
        const comision = this.calcComision(amount, paymentTypeRecord);

        const paymentIntentId = payment_details.payment_intent_id;

        // Verificar el estado del PaymentIntent con Stripe
        let pi;
        try {
            pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (err) {
            throw new BadRequestError(`No se pudo verificar el pago con Stripe: ${err.message}`);
        }

        if (pi.status !== 'succeeded') {
            throw new BadRequestError(
                `El pago con tarjeta no fue completado. Estado: ${pi.status}. ` +
                'Verifica tus datos de tarjeta e intenta nuevamente.'
            );
        }

        // Validar que el monto del PI coincida (±5 centavos de tolerancia)
        const piAmountSoles = pi.amount / 100;
        if (Math.abs(piAmountSoles - amount) > 0.05) {
            throw new BadRequestError(
                `El monto del pago (S/ ${piAmountSoles}) no coincide con el monto de la reserva (S/ ${amount}).`
            );
        }

        return {
            status: 'PAID',
            transactionId: pi.id,
            gateway: 'STRIPE',
            comision,
            paymentMethod: 'ONLINE',
            amount,
            gatewayResponse: {
                gateway_provider: 'STRIPE',
                payment_intent_id: pi.id,
                payment_method: pi.payment_method,
                currency: pi.currency,
                amount_received: pi.amount_received / 100,
                status: pi.status,
                created: new Date(pi.created * 1000).toISOString(),
                associated_bookings: createdBookings.map(b => b.booking_id)
            },
            extraFields: {
                payment_date: new Date(),
            }
        };
    }
}

module.exports = CardOnlinePaymentStrategy;
