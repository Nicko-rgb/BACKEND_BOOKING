const BookingService = require('../services/BookingService');
const { BookingDto } = require('../dto/BookingDto');
const ApiResponse = require('../../../shared/utils/ApiResponse');
const StripeService = require('../services/StripeService');
const BookingRepository = require('../repository/BookingRepository');
const { PaymentType } = require('../../catalogs/models');
const { Space } = require('../../facility/models');
const { BadRequestError } = require('../../../shared/errors/CustomErrors');

/**
 * Handler del módulo Booking
 * Lógica de orquestación entre controlador y servicio,
 * y formateo de respuestas exitosas.
 */

// Crea una reserva definitiva con pago
const createReservation = async (res, data) => {
    const result = await BookingService.processBooking(data);
    return ApiResponse.created(res, result, 'Reserva realizada con éxito');
};

// Obtiene reservas por espacio y fecha
const getBookingsBySpace = async (res, space_id, date) => {
    const result = await BookingService.getBookingsBySpaceAndDate(space_id, date);
    return ApiResponse.ok(res, result, 'Reservas del espacio');
};

// Obtiene reservas en un rango de fechas
const getBookingsRange = async (res, space_id, start_date, end_date) => {
    const result = await BookingService.getBookingsBySpaceAndRange(space_id, start_date, end_date);
    return ApiResponse.ok(res, result, 'Reservas en el rango');
};

// Crea un hold temporal
const createHold = async (res, data) => {
    const result = await BookingService.createBookingHold(data);
    return ApiResponse.created(res, result, 'Reserva temporal creada');
};

// Extiende un hold activo
const extendHold = async (res, holdId) => {
    const idToUse = typeof holdId === 'string' && holdId.startsWith('hold-')
        ? holdId.replace('hold-', '')
        : holdId;
    const result = await BookingService.extendBookingHold(idToUse);
    return ApiResponse.ok(res, result, 'Reserva temporal extendida');
};

// Cancela y elimina un hold
const cancelHold = async (res, holdId) => {
    await BookingService.cancelBookingHold(holdId);
    return ApiResponse.ok(res, null, 'Reserva temporal eliminada');
};

// Expira y elimina todos los holds activos de un usuario (timer llegó a cero o fue reservado)
const expireAllMyHolds = async (res, user_id) => {
    const result = await BookingService.cancelAllUserHolds(user_id);
    return ApiResponse.ok(res, result, 'Bloqueos expirados y liberados');
};

// Elimina todos los holds de un usuario para una fecha específica
const deleteDateHolds = async (res, data) => {
    const { user_id, space_id, booking_date } = data;
    const result = await BookingService.deleteUserHoldsByDate(user_id, space_id, booking_date);
    return ApiResponse.ok(res, result, 'Bloqueos de fecha eliminados');
};

// Copia holds de una fecha a otra
const copyHolds = async (res, data) => {
    const result = await BookingService.copyBookingHolds(data);
    return ApiResponse.ok(res, result, 'Horarios copiados exitosamente');
};

// Aprueba una reserva presencial (Admin)
const approveBooking = async (res, bookingId, adminId) => {
    const booking = await BookingService.approvePresentialBooking(bookingId, adminId);
    return ApiResponse.ok(res, booking, 'Reserva aprobada');
};

// Confirma que el efectivo fue recibido físicamente (Admin/Staff)
const confirmCashPayment = async (res, bookingId, adminId, receiptNumber = null) => {
    const booking = await BookingService.confirmCashPayment(bookingId, adminId, receiptNumber);
    return ApiResponse.ok(res, booking, 'Pago en efectivo confirmado');
};

// Confirma una reserva individual de un paquete de pago (Admin)
const confirmIndividualBooking = async (res, bookingId, adminId) => {
    const booking = await BookingService.confirmIndividualBooking(bookingId, adminId);
    return ApiResponse.ok(res, booking, 'Reserva confirmada individualmente');
};

// Rechaza una reserva individual de un paquete de pago (Admin)
const rejectIndividualBooking = async (res, bookingId, adminId, reason = null) => {
    const booking = await BookingService.rejectIndividualBooking(bookingId, adminId, reason);
    return ApiResponse.ok(res, booking, 'Reserva rechazada individualmente');
};

// Confirma todas las reservas de un paquete de pago (Admin)
const confirmAllPaymentBookings = async (res, paymentId, adminId) => {
    const result = await BookingService.confirmAllPaymentBookings(paymentId, adminId);
    return ApiResponse.ok(res, result, 'Todas las reservas del pago confirmadas');
};

// Rechaza todas las reservas de un paquete de pago (Admin)
const rejectAllPaymentBookings = async (res, paymentId, adminId, reason = null) => {
    const result = await BookingService.rejectAllPaymentBookings(paymentId, adminId, reason);
    return ApiResponse.ok(res, result, 'Todas las reservas del pago rechazadas');
};

// Rechaza (cancela) una reserva PENDING
const rejectBooking = async (res, bookingId, adminId, cancellationReason = null) => {
    await BookingService.rejectBooking(bookingId, adminId, cancellationReason);
    return ApiResponse.ok(res, null, 'Reserva rechazada y slot liberado');
};

// Sube el comprobante de pago del cliente (Yape / Plin / Bank Transfer)
const uploadPaymentProof = async (res, bookingId, proofUrl, userId, proofNumber = null) => {
    const booking = await BookingService.uploadPaymentProof(bookingId, proofUrl, userId, proofNumber);
    return ApiResponse.ok(res, booking, 'Comprobante de pago guardado');
};

// Todas las reservas de una sucursal con paginación (panel Admin)
const getBookingsBySubsidiary = async (res, sucursalId, opts) => {
    const result = await BookingService.getBookingsBySubsidiary(sucursalId, opts);
    return ApiResponse.ok(res, result, 'Reservas de la sucursal');
};

// Pagos de una sucursal con sus reservas (panel Admin)
const getPaymentsBySubsidiary = async (res, sucursalId, opts) => {
    const result = await BookingService.getPaymentsBySubsidiary(sucursalId, opts);
    return ApiResponse.ok(res, result, 'Pagos de la sucursal');
};

// Detalle completo de un pago (panel lateral Admin)
const getPaymentDetail = async (res, paymentId) => {
    const result = await BookingService.getPaymentDetail(paymentId);
    return ApiResponse.ok(res, result, 'Detalle del pago');
};

// Lista de reservas CASH pendientes de cobro (panel Admin)
const getPendingCashBookings = async (res) => {
    const result = await BookingService.getPendingCashBookings();
    return ApiResponse.ok(res, result, 'Listado de pagos pendientes');
};

// Historial de reservas del usuario
const getUserBookings = async (res, userId, status = null) => {
    const result = await BookingService.getUserBookings(userId, status);
    return ApiResponse.ok(res, result, 'Historial de reservas');
};

// Estadísticas de reservas del usuario
const getUserBookingStats = async (res, userId) => {
    const result = await BookingService.getUserBookingStats(userId);
    return ApiResponse.ok(res, result, 'Estadísticas del usuario');
};

// Detalles del comprobante
const getReceipt = async (res, bookingId, userId) => {
    const result = await BookingService.getReceiptDetails(bookingId, userId);
    return ApiResponse.ok(res, result, 'Detalle de comprobante');
};

/**
 * Crea un PaymentIntent en Stripe para que el frontend confirme el pago con tarjeta.
 *
 * Body: { amount, space_id, booking_date, description? }
 * Response: { clientSecret, paymentIntentId, amount, currency }
 *
 * El frontend usa clientSecret con Stripe.js para confirmar el pago
 * sin que los datos de tarjeta pasen por el backend.
 */
const createPaymentIntent = async (res, data) => {
    const { amount, space_id, booking_date, description } = data;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new BadRequestError('El monto es requerido y debe ser mayor a 0.');
    }

    // Obtener metadata útil para el PI (referencia para el dashboard de Stripe)
    const space = space_id ? await Space.findByPk(space_id, { attributes: ['name'] }) : null;

    const result = await StripeService.createPaymentIntent({
        amount: Number(amount),
        currency: 'pen',
        description: description || `Reserva ${space?.name || ''} - ${booking_date || ''}`.trim(),
        metadata: {
            space_id: String(space_id || ''),
            booking_date: String(booking_date || ''),
            source: 'booking_sport'
        }
    });

    return ApiResponse.ok(res, result, 'PaymentIntent creado. Usa clientSecret con Stripe.js para confirmar el pago.');
};

/**
 * Webhook de Stripe — recibe eventos de pago asíncronos.
 * IMPORTANTE: el body debe llegar RAW (Buffer), por eso tiene su propia ruta
 * con express.raw() antes de este handler.
 *
 * Eventos manejados:
 *  - payment_intent.succeeded  → confirmar booking si está PENDING
 *  - payment_intent.payment_failed → marcar payment como FAILED
 */
const stripeWebhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
        event = StripeService.constructWebhookEvent(req.body, signature);
    } catch (err) {
        console.error('⚠️  Webhook Stripe firma inválida:', err.message);
        return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    try {
        if (event.type === 'payment_intent.succeeded') {
            const pi = event.data.object;
            const bookingIds = pi.metadata?.booking_ids?.split(',').map(Number).filter(Boolean) || [];

            for (const bookingId of bookingIds) {
                const booking = await BookingRepository.findById(bookingId);
                if (booking && booking.status === 'PENDING') {
                    await BookingRepository.approveBooking(bookingId, null);
                    await BookingRepository.updatePayment(bookingId, {
                        status: 'PAID',
                        payment_date: new Date(),
                        transaction_id: pi.id,
                        payment_gateway: 'STRIPE'
                    });
                    console.log(`✅ Webhook Stripe: booking ${bookingId} confirmado por PI ${pi.id}`);
                }
            }
        } else if (event.type === 'payment_intent.payment_failed') {
            const pi = event.data.object;
            const bookingIds = pi.metadata?.booking_ids?.split(',').map(Number).filter(Boolean) || [];

            for (const bookingId of bookingIds) {
                await BookingRepository.updatePayment(bookingId, {
                    status: 'FAILED',
                    gateway_response: { failure_message: pi.last_payment_error?.message }
                });
                console.log(`❌ Webhook Stripe: pago fallido para booking ${bookingId}`);
            }
        }

        // Siempre responder 200 para que Stripe no reintente el webhook
        return res.status(200).json({ received: true });

    } catch (err) {
        console.error('Error procesando webhook Stripe:', err);
        return res.status(200).json({ received: true }); // igual 200 para no reintentar
    }
};

module.exports = {
    createReservation,
    getBookingsBySpace,
    getBookingsRange,
    getBookingsBySubsidiary,
    getPaymentsBySubsidiary,
    getPaymentDetail,
    createHold,
    extendHold,
    cancelHold,
    expireAllMyHolds,
    deleteDateHolds,
    copyHolds,
    approveBooking,
    confirmCashPayment,
    confirmIndividualBooking,
    confirmAllPaymentBookings,
    uploadPaymentProof,
    rejectBooking,
    rejectIndividualBooking,
    rejectAllPaymentBookings,
    getPendingCashBookings,
    getUserBookings,
    getUserBookingStats,
    getReceipt,
    createPaymentIntent,
    stripeWebhook
};
