const BookingHandler = require('../handlers/BookingHandler');

/**
 * Controlador del módulo Booking
 * Solo extrae parámetros del request y delega al Handler
 */

// Crea una reserva definitiva con pago
const createReservation = async (req, res, next) => {
    await BookingHandler.createReservation(res, req.body);
};

// Obtiene reservas por espacio y fecha
const getBookingsBySpace = async (req, res, next) => {
    const { space_id, date } = req.query;
    await BookingHandler.getBookingsBySpace(res, space_id, date);
};

// Obtiene reservas en un rango de fechas
const getBookingsRange = async (req, res, next) => {
    const { space_id, start_date, end_date } = req.query;
    await BookingHandler.getBookingsRange(res, space_id, start_date, end_date);
};

// Todas las reservas de una sucursal con paginación (panel Admin)
const getBookingsBySubsidiary = async (req, res, next) => {
    const { subsidiary_id, page = 1, limit = 20, status, start_date, end_date } = req.query;
    await BookingHandler.getBookingsBySubsidiary(res, subsidiary_id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status: status || null,
        startDate: start_date || null,
        endDate: end_date || null,
    });
};

// Pagos de una sucursal con sus reservas (panel Admin)
const getPaymentsBySubsidiary = async (req, res, next) => {
    const { subsidiary_id, page = 1, limit = 20, status, start_date, end_date } = req.query;
    await BookingHandler.getPaymentsBySubsidiary(res, subsidiary_id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status: status || null,
        startDate: start_date || null,
        endDate: end_date || null,
    });
};

// Detalle completo de un pago (panel lateral Admin)
const getPaymentDetail = async (req, res, next) => {
    const { paymentId } = req.params;
    await BookingHandler.getPaymentDetail(res, paymentId);
};

// Crea un hold temporal
const createHold = async (req, res, next) => {
    await BookingHandler.createHold(res, req.body);
};

// Extiende un hold activo
const extendHold = async (req, res, next) => {
    const { booking_id, hold_id } = req.body;
    await BookingHandler.extendHold(res, hold_id || booking_id);
};

// Cancela y elimina un hold
const cancelHold = async (req, res, next) => {
    const { booking_id, hold_id } = req.body;
    await BookingHandler.cancelHold(res, hold_id || booking_id);
};

// Expira todos los holds del usuario (timer llegó a cero)
const expireAllMyHolds = async (req, res, next) => {
    const { user_id } = req.body;
    await BookingHandler.expireAllMyHolds(res, user_id);
};

// Elimina todos los holds de una fecha específica
const deleteDateHolds = async (req, res, next) => {
    await BookingHandler.deleteDateHolds(res, req.body);
};

// Copia holds de una fecha a otra
const copyHolds = async (req, res, next) => {
    await BookingHandler.copyHolds(res, req.body);
};

// Aprueba una reserva presencial (Admin)
const approveBooking = async (req, res, next) => {
    const { id } = req.params;
    const adminId = req.user?.user_id;
    await BookingHandler.approveBooking(res, id, adminId);
};

// Confirma que el efectivo fue recibido físicamente (Admin/Staff)
const confirmCashPayment = async (req, res, next) => {
    const { id } = req.params;
    const adminId = req.user?.user_id;
    const { receipt_number } = req.body;
    await BookingHandler.confirmCashPayment(res, id, adminId, receipt_number);
};

// Confirma una reserva individual (Admin)
const confirmIndividualBooking = async (req, res, next) => {
    const { id } = req.params;
    const adminId = req.user?.user_id;
    await BookingHandler.confirmIndividualBooking(res, id, adminId);
};

// Rechaza una reserva individual (Admin)
const rejectIndividualBooking = async (req, res, next) => {
    const { id } = req.params;
    const adminId = req.user?.user_id;
    const { reason } = req.body;
    await BookingHandler.rejectIndividualBooking(res, id, adminId, reason);
};

// Confirma todas las reservas de un pago (Admin)
const confirmAllPaymentBookings = async (req, res, next) => {
    const { paymentId } = req.params;
    const adminId = req.user?.user_id;
    await BookingHandler.confirmAllPaymentBookings(res, paymentId, adminId);
};

// Rechaza todas las reservas de un pago (Admin)
const rejectAllPaymentBookings = async (req, res, next) => {
    const { paymentId } = req.params;
    const adminId = req.user?.user_id;
    const { reason } = req.body;
    await BookingHandler.rejectAllPaymentBookings(res, paymentId, adminId, reason);
};

// Rechaza (cancela) una reserva PENDING — Admin/Dueño deniega el pago en efectivo
const rejectBooking = async (req, res, next) => {
    const { id } = req.params;
    const adminId = req.user?.user_id;
    const { cancellation_reason } = req.body;
    await BookingHandler.rejectBooking(res, id, adminId, cancellation_reason);
};

// Sube el comprobante de pago (Yape/Plin/Bank) — requiere multer upload.single('payment_proof')
const uploadPaymentProof = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.user_id || Number(req.body.user_id);
    const file = req.file;
    if (!file) throw new Error('No se recibió ningún archivo de comprobante');
    const { buildFileUrl } = require('../../../shared/middlewares/uploadMiddleware');
    const proofUrl = buildFileUrl(file);
    // Número de operación/comprobante enviado como campo de texto en el FormData
    const proofNumber = req.body.payment_proof_number || null;
    await BookingHandler.uploadPaymentProof(res, id, proofUrl, userId, proofNumber);
};

// Lista de reservas CASH pendientes de cobro (panel Admin)
const getPendingCashBookings = async (req, res, next) => {
    await BookingHandler.getPendingCashBookings(res);
};

// Historial de reservas del usuario autenticado
// GET /bookings/my-bookings?status=CONFIRMED
const getUserBookings = async (req, res, next) => {
    const userId = req.params.userId || req.query.user_id || req.user?.user_id;
    const { status } = req.query;
    await BookingHandler.getUserBookings(res, userId, status || null);
};

// Estadísticas de reservas del usuario
// GET /bookings/my-stats
const getUserBookingStats = async (req, res, next) => {
    const userId = req.params.userId || req.query.user_id || req.user?.user_id;
    await BookingHandler.getUserBookingStats(res, userId);
};

// Obtiene los detalles del comprobante
const getReceipt = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.user_id;
    await BookingHandler.getReceipt(res, id, userId);
};

// Crea un PaymentIntent de Stripe para pago con tarjeta
// POST /bookings/payment-intent  Body: { amount, space_id, booking_date }
const createPaymentIntent = async (req, res, next) => {
    await BookingHandler.createPaymentIntent(res, req.body);
};

// Webhook de Stripe — body RAW requerido, ver ruta con express.raw()
const stripeWebhook = async (req, res, next) => {
    await BookingHandler.stripeWebhook(req, res);
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
