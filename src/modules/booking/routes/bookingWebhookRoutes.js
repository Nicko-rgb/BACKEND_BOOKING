const express = require('express');
const router = express.Router();
const bookingWebhookController = require('../controllers/BookingWebhookController');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');

const asyncHandler = GlobalErrorHandler.asyncHandler;

// Endpoint público para las notificaciones de pago Yape de MercadoPago
router.post('/webhook', asyncHandler(bookingWebhookController.handleWebhook));

module.exports = router;
