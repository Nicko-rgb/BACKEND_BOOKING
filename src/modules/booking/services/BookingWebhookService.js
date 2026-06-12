/**
 * BookingWebhookService - Respaldo asíncrono para pagos Yape vía MercadoPago
 *
 * El cobro Yape se resuelve normalmente de forma SÍNCRONA en YapeMercadoPagoStrategy
 * (approved → reserva CONFIRMED al instante). Este webhook solo cubre el caso en que
 * MercadoPago dejó el pago en 'in_process'/'pending' y luego lo aprueba: entonces
 * confirma la reserva que había quedado PENDING.
 *
 * Seguridad: nunca confiamos en el payload del webhook. Re-consultamos el pago real
 * a la API de MercadoPago (anti-fraude) antes de confirmar nada.
 */
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');
const { Booking, PaymentBooking } = require('../models');
const { client: mpClient, Payment } = require('../../../config/mercadopago');
const { getIO } = require('../../../config/socketConfig');

/** Normaliza booking_date (Date | string) a 'YYYY-MM-DD' para las salas de socket */
const toDateKey = (value) => (
    value instanceof Date ? value.toISOString().split('T')[0] : String(value).split('T')[0]
);

const handleWebhook = async (payload) => {
    const { type, data } = payload || {};

    // MercadoPago notifica varios tipos; solo nos interesan los de pago ────────────────────
    if (type !== 'payment') {
        console.log(`[Booking Webhook] Evento ignorado. Tipo: ${type}`);
        return { success: true, ignored: true };
    }

    const paymentId = data?.id;
    if (!paymentId) {
        console.warn('[Booking Webhook] Notificación sin ID de pago.');
        return { success: false, error: 'No data ID' };
    }

    // Estado real del pago en MercadoPago (no confiamos en el payload) ──────────────────────
    let mpData;
    try {
        mpData = await new Payment(mpClient).get({ id: paymentId });
    } catch (mpError) {
        console.error(`[Booking Webhook] Error al consultar el pago ${paymentId}:`, mpError?.message || mpError);
        throw mpError; // Relanzar → MP reintentará la notificación
    }

    if (mpData.status !== 'approved') {
        console.log(`[Booking Webhook] Pago ${paymentId} en estado "${mpData.status}". Ignorado.`);
        return { success: true, ignored: true };
    }

    // Buscar el PaymentBooking PENDING cuyo transaction_id = external_reference del pago ─────
    const payment = await PaymentBooking.findOne({
        where: {
            transaction_id: mpData.external_reference,
            payment_gateway: 'YAPE_MP',
            status: { [Op.in]: ['PENDING', 'AWAITING_APPROVAL'] }
        },
        include: [{ association: 'bookings' }]
    });

    if (!payment) {
        // Ya fue confirmado síncronamente o no corresponde a este sistema ──────────────────
        console.log(`[Booking Webhook] Sin pago PENDING para ref ${mpData.external_reference}. Posiblemente ya confirmado.`);
        return { success: true, ignored: true };
    }

    // Confirmar pago + reservas en una sola transacción ─────────────────────────────────────
    const transaction = await sequelize.transaction();
    try {
        await payment.update({
            status:            'PAID',
            payment_date:      new Date(),
            payment_reference: String(paymentId)
        }, { transaction });

        await Booking.update(
            { status: 'CONFIRMED', confirmed_at: new Date() },
            { where: { payment_id: payment.payment_id, status: 'PENDING' }, transaction }
        );

        await transaction.commit();
        console.log(`[Booking Webhook] Pago ${payment.payment_id} confirmado por webhook (MP ${paymentId}).`);
    } catch (error) {
        await transaction.rollback();
        console.error(`[Booking Webhook] Error al confirmar el pago ${payment.payment_id}:`, error?.message || error);
        throw error;
    }

    // Notificar en tiempo real que los slots quedaron confirmados ────────────────────────────
    try {
        const io = getIO();
        (payment.bookings || []).forEach(b => {
            const dateKey = toDateKey(b.booking_date);
            io.to(`space:${String(b.space_id)}:${dateKey}`).emit('booking:confirmed', {
                booking_date: dateKey,
                bookings: [{ start_time: b.start_time, end_time: b.end_time }]
            });
        });
    } catch (socketErr) {
        // Un fallo de socket no debe revertir un pago ya confirmado ───────────────────────
        console.error('[Booking Webhook] Error al emitir evento de socket:', socketErr?.message || socketErr);
    }

    return { success: true };
};

module.exports = { handleWebhook };
