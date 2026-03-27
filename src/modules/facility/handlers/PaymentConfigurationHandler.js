const PaymentConfigurationService = require('../services/PaymentConfigurationService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

/**
 * Guardar métodos de pago activos
 */
const saveActivePayments = async (res, sucursalId, paymentMethods, userId) => {
    const data = await PaymentConfigurationService.saveActivePayments(sucursalId, paymentMethods, userId);
    return ApiResponse.ok(res, data, 'Métodos de pago actualizados correctamente.');
};

/**
 * Actualizar orden de métodos de pago
 */
const updatePaymentOrder = async (res, sucursalId, orderedPayments, userId) => {
    const data = await PaymentConfigurationService.updatePaymentOrder(sucursalId, orderedPayments, userId);
    return ApiResponse.ok(res, data, 'Orden de pagos actualizado correctamente.');
};

module.exports = {
    saveActivePayments
};
