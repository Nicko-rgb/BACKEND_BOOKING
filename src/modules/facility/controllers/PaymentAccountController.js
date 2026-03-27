const PaymentAccountHandler = require('../handlers/PaymentAccountHandler');

const getAccountsBySucursal = async (req, res, next) => {
    const sucursalId = req.params.sucursalId || req.params.id;
    await PaymentAccountHandler.getAccountsBySucursal(res, sucursalId);
};

const getAccountsByType = async (req, res, next) => {
    await PaymentAccountHandler.getAccountsByType(res, req.params.sucursalId, req.params.paymentTypeId);
};

const createAccount = async (req, res, next) => {
    await PaymentAccountHandler.createAccount(res, req.body, req.user?.user_id, req.files);
};

const updateAccount = async (req, res, next) => {
    await PaymentAccountHandler.updateAccount(res, req.params.id, req.body, req.user?.user_id, req.files);
};

const deleteAccount = async (req, res, next) => {
    await PaymentAccountHandler.deleteAccount(res, req.params.id);
};

module.exports = { getAccountsBySucursal, getAccountsByType, createAccount, updateAccount, deleteAccount };
