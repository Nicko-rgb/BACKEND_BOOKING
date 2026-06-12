const bookingWebhookHandler = require('../handlers/BookingWebhookHandler');

// Extrae el payload del request y delega en el handler (sin lógica de negocio)
const handleWebhook = async (req, res) => {
    await bookingWebhookHandler.handleWebhook(res, req.body);
};

module.exports = { handleWebhook };
