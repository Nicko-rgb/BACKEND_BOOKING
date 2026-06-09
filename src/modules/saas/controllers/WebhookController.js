const webhookHandler = require('../handlers/WebhookHandler');

const handleWebhook = async (req, res, next) => {
    await webhookHandler.handleWebhook(req, res);
};

module.exports = {
    handleWebhook
};

