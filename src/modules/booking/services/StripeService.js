/**
 * StripeService - Integración con Stripe usando la API moderna de PaymentIntents
 *
 * Flujo completo:
 *  1. Frontend llama POST /bookings/payment-intent → createPaymentIntent()
 *  2. Stripe devuelve client_secret al frontend
 *  3. Frontend confirma el pago con Stripe.js (los datos de tarjeta NUNCA llegan al backend)
 *  4. Frontend envía POST /bookings con payment_details.payment_intent_id
 *  5. CardOnlinePaymentStrategy llama verifyPaymentIntent() para confirmar el estado
 *  6. Webhook POST /bookings/webhooks/stripe actúa como capa de confiabilidad
 *
 * IMPORTANTE: Nunca usar stripe.charges.create (API deprecada).
 * Los datos de tarjeta JAMÁS deben pasar por el backend.
 */
const Stripe = require('stripe');

class StripeService {
    constructor() {
        if (process.env.STRIPE_SECRET_KEY) {
            this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2024-04-10'
            });
        } else {
            console.warn('⚠️  STRIPE_SECRET_KEY no configurado. Los pagos con tarjeta fallarán.');
        }
    }

    _assertInit() {
        if (!this.stripe) {
            throw new Error('Stripe no está inicializado. Configura STRIPE_SECRET_KEY en .env');
        }
    }

    /**
     * Crea un PaymentIntent en Stripe y devuelve el client_secret al frontend.
     * El frontend usará este client_secret con Stripe.js para confirmar el pago
     * sin que los datos de tarjeta pasen por nuestro servidor.
     *
     * @param {Object} params
     * @param {number} params.amount          - Monto en soles (ej: 50.00)
     * @param {string} [params.currency]      - Código ISO moneda (default: 'pen')
     * @param {string} [params.description]   - Descripción del cobro
     * @param {Object} [params.metadata]      - Metadata para Stripe (booking_ids, etc.)
     * @returns {Promise<{clientSecret: string, paymentIntentId: string, amount: number}>}
     */
    async createPaymentIntent({ amount, currency = 'pen', description, metadata = {} }) {
        this._assertInit();

        const amountInCents = Math.round(amount * 100);

        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountInCents,
                currency: currency.toLowerCase(),
                description: description || 'Reserva Booking Sport',
                metadata,
                automatic_payment_methods: { enabled: true }
            });

            return {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency
            };
        } catch (error) {
            console.error('Error creando PaymentIntent en Stripe:', error.message);
            throw new Error(`No se pudo iniciar el pago con tarjeta: ${error.message}`);
        }
    }

    /**
     * Verifica el estado de un PaymentIntent ya confirmado por el frontend.
     * Usado por CardOnlinePaymentStrategy antes de confirmar la reserva.
     *
     * @param {string} paymentIntentId  - ID del PaymentIntent (pi_xxx)
     * @returns {Promise<Object>}       - El PaymentIntent de Stripe
     */
    async verifyPaymentIntent(paymentIntentId) {
        this._assertInit();

        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            console.error('Error verificando PaymentIntent:', error.message);
            throw new Error(`No se pudo verificar el pago: ${error.message}`);
        }
    }

    /**
     * Construye y verifica la firma del webhook de Stripe.
     * El body debe llegar RAW (Buffer), no como JSON parseado.
     *
     * @param {Buffer|string} rawBody         - Body crudo del request
     * @param {string}        stripeSignature - Header 'stripe-signature'
     * @returns {Object} Evento Stripe verificado
     */
    constructWebhookEvent(rawBody, stripeSignature) {
        this._assertInit();

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET no configurado en .env');
        }

        try {
            return this.stripe.webhooks.constructEvent(rawBody, stripeSignature, webhookSecret);
        } catch (error) {
            throw new Error(`Firma de webhook inválida: ${error.message}`);
        }
    }

    /**
     * Procesa un reembolso total o parcial.
     *
     * @param {string} paymentIntentId  - ID del PaymentIntent original
     * @param {number} [amountSoles]    - Monto en soles (null = reembolso total)
     * @param {string} [reason]         - 'duplicate' | 'fraudulent' | 'requested_by_customer'
     * @returns {Promise<Object>}       - Objeto Refund de Stripe
     */
    async refund(paymentIntentId, amountSoles = null, reason = 'requested_by_customer') {
        this._assertInit();

        const refundParams = { payment_intent: paymentIntentId, reason };
        if (amountSoles !== null) {
            refundParams.amount = Math.round(amountSoles * 100);
        }

        try {
            return await this.stripe.refunds.create(refundParams);
        } catch (error) {
            console.error('Error procesando reembolso Stripe:', error.message);
            throw new Error(`No se pudo procesar el reembolso: ${error.message}`);
        }
    }
}

module.exports = new StripeService();