/**
 * YapeMercadoPagoStrategy - Pago automático con Yape vía MercadoPago
 *
 * Reemplaza el flujo manual de Yape (comprobante + confirmación del admin) por
 * un cobro inmediato procesado por la API de MercadoPago (POST /v1/payments).
 *
 * Flujo real de MercadoPago Yape (Perú):
 *  1. El frontend (sdk-js → mp.yape) toma el celular + OTP de 6 dígitos de la app
 *     Yape del cliente y genera un `token` de un solo uso.
 *  2. Este strategy recibe ese token en payment_details.yape_token y cobra con
 *     payment_method_id: 'yape'.
 *  3. MercadoPago responde de forma síncrona:
 *       - approved    → status 'PAID'    → la reserva se confirma de inmediato
 *       - in_process  → status 'PENDING' → el webhook la confirmará al aprobarse
 *       - rejected    → se lanza error y el BookingService hace rollback
 *
 * Nota: NO depende de una cuenta Yape configurada en la sucursal (a diferencia
 * del Yape manual). El cobro entra a la cuenta MercadoPago del operador del SaaS.
 */
const { randomUUID } = require('crypto');
const BasePaymentStrategy = require('./BasePaymentStrategy');
const { client: mpClient, Payment } = require('../../../config/mercadopago');
const { BadRequestError } = require('../../../shared/errors/CustomErrors');

class YapeMercadoPagoStrategy extends BasePaymentStrategy {
    /**
     * Valida que el request traiga el token Yape generado en el frontend.
     * El OTP nunca llega al backend: solo el token de un solo uso que produce el SDK.
     */
    async validate(data) {
        const { payment_details } = data;

        if (!process.env.MP_ACCESS_TOKEN) {
            throw new BadRequestError('El pago con Yape no está disponible en este momento. Contacta al administrador.');
        }

        if (!payment_details?.yape_token) {
            throw new BadRequestError(
                'Para pagar con Yape necesitas autorizar el cobro en tu app (número + código de aprobación de 6 dígitos).'
            );
        }

        // El celular es referencial (MP lo asocia al token); validamos formato si llega
        const phone = payment_details.yape_phone;
        if (phone && !/^9\d{8}$/.test(String(phone))) {
            throw new BadRequestError('El número de celular Yape debe tener 9 dígitos y empezar con 9.');
        }
    }

    /**
     * Cobra con MercadoPago y mapea la respuesta al PaymentResult del sistema.
     *
     * @param {Object} data              - Request (incluye payment_details con yape_token)
     * @param {Array}  createdBookings   - Reservas ya creadas en la transacción
     * @param {Object} _transaction      - Transacción Sequelize activa (no se usa aquí)
     * @param {Object} _sucursalConfig   - Configuración de sucursal (no aplica a Yape MP)
     * @param {Object} paymentTypeRecord - PaymentType para calcular comisión
     */
    async process(data, createdBookings, _transaction, _sucursalConfig, paymentTypeRecord) {
        const { payment_details, total_amount, bookings: bookingsInput } = data;

        const amount = Number(
            (total_amount || (bookingsInput || []).reduce((s, b) => s + Number(b.total_amount), 0)).toFixed(2)
        );
        const comision = this.calcComision(amount, paymentTypeRecord);

        // external_reference: ancla única para casar el webhook con este pago ──────────────
        const externalRef = `YAPE-${randomUUID().slice(0, 8)}-${Date.now()}`;
        const backendUrl = process.env.BACKEND_URL || 'https://api.redepor.com';

        // Email del pagador: requerido por MP. Lo envía el frontend; fallback sintético ─────
        const email = payment_details?.yape_email
            || data.email
            || `cliente_${data.user_id || 'guest'}@redepor.com`;
        const phone = payment_details?.yape_phone;

        // ── Cobrar con MercadoPago ────────────────────────────────────────────────────────
        let mpResponse;
        try {
            mpResponse = await new Payment(mpClient).create({
                body: {
                    transaction_amount: amount,
                    token:              payment_details.yape_token,
                    payment_method_id:  'yape',
                    description:        `Reserva deportiva #${createdBookings.map(b => b.booking_id).join(', ')}`,
                    payer:              { email, ...(phone ? { phone: { area_code: '51', number: String(phone) } } : {}) },
                    external_reference: externalRef,
                    notification_url:   `${backendUrl}/api/v1/booking-webhooks/webhook`
                }
            });
        } catch (mpError) {
            // MP entrega el detalle del error dentro de `cause`; lo formateamos legible ──────
            const cause   = mpError?.cause ?? mpError?.message ?? mpError;
            const message = Array.isArray(cause)
                ? cause.map(c => `[${c.code}] ${c.description}`).join(' | ')
                : String(cause);
            console.error(`[Yape MP] HTTP ${mpError?.status ?? 'N/A'} — ${message}`);
            throw new BadRequestError('No se pudo procesar el pago con Yape. Verifica tu código de aprobación e intenta nuevamente.');
        }

        if (!mpResponse?.id) throw new BadRequestError('MercadoPago no devolvió una respuesta válida para el pago Yape.');

        const mpStatus = mpResponse.status;
        console.log(`[Yape MP] Pago ${mpResponse.id} — Estado: ${mpStatus} (ref ${externalRef})`);

        // Pago rechazado → abortar (el BookingService revierte la reserva) ──────────────────
        if (mpStatus === 'rejected') {
            const detail = mpResponse.status_detail || 'rejected';
            throw new BadRequestError(`El pago con Yape fue rechazado (${detail}). Verifica tu saldo o tu código e intenta nuevamente.`);
        }

        // approved → PAID al instante | in_process / pending → PENDING (lo confirma el webhook)
        const status = mpStatus === 'approved' ? 'PAID' : 'PENDING';

        return {
            status,
            transactionId: externalRef,   // = external_reference → clave de búsqueda del webhook
            gateway:       'YAPE_MP',
            comision,
            paymentMethod: 'ONLINE',
            amount,
            gatewayResponse: {
                gateway_provider:   'MERCADOPAGO',
                payment_method:     'yape',
                mp_payment_id:      mpResponse.id,
                mp_status:          mpStatus,
                mp_status_detail:   mpResponse.status_detail || null,
                external_reference: externalRef,
                payer_email:        email,
                associated_bookings: createdBookings.map(b => b.booking_id)
            },
            extraFields: {
                payment_date:      status === 'PAID' ? new Date() : null,
                payment_reference: String(mpResponse.id),
                contact_phone:     phone || null
            }
        };
    }
}

module.exports = YapeMercadoPagoStrategy;
