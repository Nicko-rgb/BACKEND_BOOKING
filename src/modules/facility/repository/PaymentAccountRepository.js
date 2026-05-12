const PaymentAccount = require('../models/PaymentAccount');
const PaymentType = require('../../catalogs/models/PaymentType');

class PaymentAccountRepository {
    static async findBySucursal(sucursalId) {
        return await PaymentAccount.findAll({
            where: { sucursal_id: sucursalId, is_active: true },
            include: [{ model: PaymentType, as: 'paymentType', attributes: ['code', 'name', 'category'] }],
            order: [['payment_type_id', 'ASC'], ['sort_order', 'ASC']]
        });
    }

    static async findBySucursalAndType(sucursalId, paymentTypeId, onlyActive = true) {
        const where = { sucursal_id: sucursalId, payment_type_id: paymentTypeId };
        if (onlyActive) where.is_active = true;
        
        return await PaymentAccount.findAll({
            where,
            order: [['sort_order', 'ASC']]
        });
    }

    static async reactivateBySucursalAndType(sucursalId, paymentTypeId, transaction) {
        return await PaymentAccount.update(
            { is_active: true },
            { 
                where: { sucursal_id: sucursalId, payment_type_id: paymentTypeId, is_active: false },
                transaction
            }
        );
    }

    static async findById(id) {
        return await PaymentAccount.findOne({ where: { payment_account_id: id, is_active: true } });
    }

    static async create(data) {
        return await PaymentAccount.create(data);
    }

    static async update(id, data) {
        const account = await PaymentAccount.findByPk(id);
        if (!account) return null;
        return await account.update(data);
    }

    static async hardDelete(id) {
        const account = await PaymentAccount.findByPk(id);
        if (!account) return false;
        await account.destroy();
        return true;
    }
}

module.exports = PaymentAccountRepository;
