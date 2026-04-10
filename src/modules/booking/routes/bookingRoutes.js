/**
 * bookingRoutes.js
 * Creación de reservas, holds, consultas, historial y comprobantes.
 * Montado en /api/bookings
 *
 * Los endpoints de procesamiento de pagos viven en paymentBookingRoutes.js
 */
const express = require('express');
const router = express.Router();

const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const { validateDTO } = require('../../../shared/middlewares/validateDTO');
const { createReservationDto, createHoldDto } = require('../dto/BookingDto');
const { protegerPermiso } = require('../../../shared/middlewares/proteger');
const { verificarTokenAuth } = require('../../../shared/middlewares/verificarTokenAuth');
const upload = require('../../../shared/middlewares/uploadMiddleware');

const {
    createReservation,
    getBookingsBySpace,
    getBookingsRange,
    getBookingsBySubsidiary,
    createHold,
    extendHold,
    cancelHold,
    expireAllMyHolds,
    deleteDateHolds,
    copyHolds,
    approveBooking,
    uploadPaymentProof,
    rejectBooking,
    getPendingCashBookings,
    getUserBookings,
    getUserBookingStats,
    getReceipt,
} = require('../controllers/bookingController');

// ── Creación de reserva ───────────────────────────────────────────────────────
router.post('/', verificarTokenAuth, validateDTO(createReservationDto), GlobalErrorHandler.asyncHandler(createReservation));

// ── Consultas de disponibilidad (públicas) ────────────────────────────────────
router.get('/by-space', verificarTokenAuth, GlobalErrorHandler.asyncHandler(getBookingsBySpace));
router.get('/range',    verificarTokenAuth, GlobalErrorHandler.asyncHandler(getBookingsRange));

// ── Reservas de sucursal (admin) ──────────────────────────────────────────────
router.get('/by-subsidiary',
    ...protegerPermiso('booking.view_facility'),
    GlobalErrorHandler.asyncHandler(getBookingsBySubsidiary)
);

// ── Holds temporales ──────────────────────────────────────────────────────────
router.post('/hold',              verificarTokenAuth, validateDTO(createHoldDto), GlobalErrorHandler.asyncHandler(createHold));
router.post('/extend',            verificarTokenAuth, GlobalErrorHandler.asyncHandler(extendHold));
router.post('/cancel-hold',       verificarTokenAuth, GlobalErrorHandler.asyncHandler(cancelHold));
router.post('/expire-my-holds',   verificarTokenAuth, GlobalErrorHandler.asyncHandler(expireAllMyHolds));
router.post('/delete-date-holds', verificarTokenAuth, GlobalErrorHandler.asyncHandler(deleteDateHolds));
router.post('/copy-holds',        verificarTokenAuth, GlobalErrorHandler.asyncHandler(copyHolds));

// ── Gestión de reservas (admin) ───────────────────────────────────────────────
router.put('/:id/approve', ...protegerPermiso('booking.confirm'), GlobalErrorHandler.asyncHandler(approveBooking));
router.put('/:id/reject',  ...protegerPermiso('booking.cancel'),  GlobalErrorHandler.asyncHandler(rejectBooking));

// ── Comprobante de pago (cliente sube imagen) ─────────────────────────────────
router.post('/:id/upload-proof', verificarTokenAuth, upload.single('payment_proof'), GlobalErrorHandler.asyncHandler(uploadPaymentProof));

// ── Reservas pendientes de confirmación de pago (admin) ──────────────────────
router.get('/pending-cash', ...protegerPermiso('booking.view_facility'), GlobalErrorHandler.asyncHandler(getPendingCashBookings));

// ── Historial y estadísticas del usuario ─────────────────────────────────────
router.get('/my-bookings', verificarTokenAuth, GlobalErrorHandler.asyncHandler(getUserBookings));
router.get('/my-stats',    verificarTokenAuth, GlobalErrorHandler.asyncHandler(getUserBookingStats));
router.get('/:id/receipt', verificarTokenAuth, GlobalErrorHandler.asyncHandler(getReceipt));

module.exports = router;
