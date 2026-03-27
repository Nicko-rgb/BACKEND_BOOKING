const ConfigurationHandler = require('../handlers/ConfigurationHandler');
const PaymentConfigurationHandler = require('../handlers/PaymentConfigurationHandler');
const ConfigurationService = require('../services/ConfigurationService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

const getConfiguration = async (req, res, next) => {
    const { companyId } = req.params;
    await ConfigurationHandler.getConfiguration(res, companyId);
};

const saveConfiguration = async (req, res, next) => {
    const { companyId } = req.params;
    const configData = req.body;
    const userId = req.user?.user_id;
    const files = req.files;
    await ConfigurationHandler.saveConfiguration(res, companyId, configData, userId, files);
};

const saveActivePayments = async (req, res, next) => {
    const { sucursal_id, payment_methods } = req.validatedData || req.body;
    const userId = req.user?.user_id;
    await PaymentConfigurationHandler.saveActivePayments(res, sucursal_id, payment_methods, userId);
};

const updatePaymentOrder = async (req, res, next) => {
    const { sucursal_id, ordered_payments } = req.validatedData || req.body;
    const userId = req.user?.user_id;
    await PaymentConfigurationHandler.updatePaymentOrder(res, sucursal_id, ordered_payments, userId);
};

/**
 * DELETE /api/companies/config/:companyId/media/:mediaField
 * Elimina una imagen de configuración (logo | banner).
 */
const deleteConfigMedia = async (req, res, next) => {
    const { companyId, mediaField } = req.params;
    await ConfigurationHandler.deleteConfigMedia(res, companyId, mediaField);
};

module.exports = {
    getConfiguration,
    saveConfiguration,
    saveActivePayments,
    deleteConfigMedia,
};
