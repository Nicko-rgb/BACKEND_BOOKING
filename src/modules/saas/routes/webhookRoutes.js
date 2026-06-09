const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/WebhookController');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');

const asyncHandler = GlobalErrorHandler.asyncHandler;

// Endpoint público para MercadoPago
router.post('/webhook', asyncHandler(webhookController.handleWebhook));

module.exports = router;
