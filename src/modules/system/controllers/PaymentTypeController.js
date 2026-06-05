const PaymentTypeHandler = require('../handlers/PaymentTypeHandler');

/**
 * Controlador para tipos de pago
 * Se encarga de extraer los datos del request
 */

// Obtiene tipos de pagos por pais
const getPaymentTypesByCountry = async (req, res, next) => {
    const { countryId } = req.params;
    await PaymentTypeHandler.getPaymentTypesByCountry(res, countryId);
};

// Obtiene toda la lista tipos de pagos
const getAllPaymentTypes = async (req, res, next) => {
    await PaymentTypeHandler.getAllPaymentTypes(res);
};

module.exports = {
    getPaymentTypesByCountry,
    getAllPaymentTypes
};
