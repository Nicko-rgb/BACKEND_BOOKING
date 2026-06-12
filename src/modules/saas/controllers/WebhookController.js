const webhookHandler = require('../handlers/WebhookHandler');

const handleWebhook = async (req, res) => {
    await webhookHandler.handleWebhook(res, req.body);
};

module.exports = { handleWebhook };
