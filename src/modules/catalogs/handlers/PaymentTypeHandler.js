const PaymentTypeService = require('../services/PaymentTypeService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

/**
 * Handler para tipos de pago
 * Se encarga de las respuestas al cliente
 */
const getPaymentTypesByCountry = async (res, countryId) => {
    const paymentTypes = await PaymentTypeService.getPaymentTypesByCountry(countryId);
    return ApiResponse.ok(res, paymentTypes, 'Tipos de pago obtenidos exitosamente');
};

const getAllPaymentTypes = async (res) => {
    const paymentTypes = await PaymentTypeService.getAllPaymentTypes();
    return ApiResponse.ok(res, paymentTypes, 'Todos los tipos de pago obtenidos exitosamente');
};

module.exports = {
    getPaymentTypesByCountry,
    getAllPaymentTypes
};
