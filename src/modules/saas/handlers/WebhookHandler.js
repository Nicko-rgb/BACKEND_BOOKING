const webhookService = require('../services/WebhookService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

/** MP espera 200 para confirmar recepción; 500 le indica que debe reintentar */
const handleWebhook = async (res, payload) => {
    console.log('[MP Webhook] Notificación recibida:', JSON.stringify(payload));
    const result = await webhookService.handleWebhook(payload);
    return ApiResponse.ok(res, result, 'Webhook procesado');
};

module.exports = { handleWebhook };
