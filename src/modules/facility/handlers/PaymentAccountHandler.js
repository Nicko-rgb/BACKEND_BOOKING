const PaymentAccountService = require('../services/PaymentAccountService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

const getAccountsBySucursal = async (res, sucursalId) => {
    const accounts = await PaymentAccountService.getAccountsBySucursal(sucursalId);
    return ApiResponse.ok(res, accounts, 'Cuentas de pago obtenidas');
};

const getAccountsByType = async (res, sucursalId, paymentTypeId) => {
    const accounts = await PaymentAccountService.getAccountsByType(sucursalId, paymentTypeId);
    return ApiResponse.ok(res, accounts, 'Cuentas de pago por tipo obtenidas');
};

const createAccount = async (res, data, userId, files) => {
    const account = await PaymentAccountService.createAccount(data, userId, files);
    return ApiResponse.created(res, account, 'Cuenta de pago creada correctamente');
};

const updateAccount = async (res, id, data, userId, files) => {
    const account = await PaymentAccountService.updateAccount(id, data, userId, files);
    return ApiResponse.ok(res, account, 'Cuenta de pago actualizada correctamente');
};

const deleteAccount = async (res, id) => {
    const result = await PaymentAccountService.deleteAccount(id);
    return ApiResponse.ok(res, result, 'Cuenta de pago eliminada correctamente');
};

module.exports = { getAccountsBySucursal, getAccountsByType, createAccount, updateAccount, deleteAccount };
