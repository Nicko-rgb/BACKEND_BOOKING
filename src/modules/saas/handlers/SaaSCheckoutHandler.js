const checkoutService = require('../services/SaaSCheckoutService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

const createCheckoutSession = async (res, payload) => {
    const result = await checkoutService.createCheckoutSession(payload);
    return ApiResponse.created(res, result, 'Sesión de pago iniciada correctamente');
};

module.exports = {
    createCheckoutSession
};
