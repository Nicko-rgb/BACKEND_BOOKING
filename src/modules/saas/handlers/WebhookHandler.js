const webhookService = require('../services/WebhookService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

const handleWebhook = async (req, res) => {
    const payload = req.body;
    try {
        console.log('[Webhook Handler] Procesando notificación de MercadoPago:', JSON.stringify(payload));
        const result = await webhookService.handleWebhook(payload);
        return ApiResponse.ok(res, result, 'Webhook recibido y procesado correctamente');
    } catch (error) {
        console.error('[Webhook Handler] Error crítico procesando webhook:', error);
        // Si hay un error crítico, delegamos al ApiResponse.error para responder adecuadamente
        // pero enviando status 500 para indicarle a MercadoPago que reintente.
        return ApiResponse.error(req, res, 'WEBHOOK_ERROR', error.message, null, 500);
    }
};

module.exports = {
    handleWebhook
};
