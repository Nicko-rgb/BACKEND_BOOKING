/**
 * paymentBookingRoutes.js
 * Procesamiento de pagos de reservas: Stripe, confirmaciones y rechazos.
 * Montado en /api/bookings
 *
 * ⚠️  El webhook de Stripe usa express.raw() — debe ir antes del express.json()
 *     global. En server.js este router se registra antes del middleware de JSON.
 */
const express = require('express');
const router = express.Router();

const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const { protegerPermiso } = require('../../../shared/middlewares/proteger');
const { verificarTokenAuth } = require('../../../shared/middlewares/verificarTokenAuth');

const {
    createPaymentIntent,
    stripeWebhook,
    confirmCashPayment,
    confirmIndividualBooking,
    rejectIndividualBooking,
    confirmAllPaymentBookings,
    rejectAllPaymentBookings,
    getPaymentsBySubsidiary,
    getPaymentDetail,
} = require('../controllers/bookingController');

// ── Webhook Stripe (body raw, NO JSON) ───────────────────────────────────────
router.post(
    '/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhook
);

// ── Payment Intent (paso 1 del flujo de tarjeta) ─────────────────────────────
router.post('/payment-intent', verificarTokenAuth, GlobalErrorHandler.asyncHandler(createPaymentIntent));

// ── Pagos de sucursal (vista admin) ──────────────────────────────────────────
router.get('/payments-by-subsidiary',
    ...protegerPermiso('booking.view_facility'),
    GlobalErrorHandler.asyncHandler(getPaymentsBySubsidiary)
);

// ── Detalle completo de un pago (panel lateral admin) ────────────────────────
router.get('/payments/:paymentId',
    ...protegerPermiso('booking.view_facility'),
    GlobalErrorHandler.asyncHandler(getPaymentDetail)
);

// ── Confirmar pagos (admin registra cobro recibido) ───────────────────────────
router.put('/:id/confirm-cash',
    ...protegerPermiso('booking.confirm'),
    GlobalErrorHandler.asyncHandler(confirmCashPayment)
);

router.put('/:id/confirm-individual',
    ...protegerPermiso('booking.confirm'),
    GlobalErrorHandler.asyncHandler(confirmIndividualBooking)
);

router.put('/:id/reject-individual',
    ...protegerPermiso('booking.cancel'),
    GlobalErrorHandler.asyncHandler(rejectIndividualBooking)
);

router.put('/payment/:paymentId/confirm-all',
    ...protegerPermiso('booking.confirm'),
    GlobalErrorHandler.asyncHandler(confirmAllPaymentBookings)
);

router.put('/payment/:paymentId/reject-all',
    ...protegerPermiso('booking.cancel'),
    GlobalErrorHandler.asyncHandler(rejectAllPaymentBookings)
);

module.exports = router;
