const checkoutHandler = require('../handlers/SaaSCheckoutHandler');

const createCheckoutSession = async (req, res, next) => {
    // Usar datos validados por el middleware validateDTO
    const payload = req.validatedData;
    
    await checkoutHandler.createCheckoutSession(res, payload);
};

module.exports = {
    createCheckoutSession
};

