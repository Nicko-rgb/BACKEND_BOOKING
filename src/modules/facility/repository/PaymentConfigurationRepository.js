const ConfigurationPayment = require('../models/ConfigurationPayment');
const PaymentType = require('../../catalogs/models/PaymentType');
const PaymentAccount = require('../models/PaymentAccount');
const { Op } = require('sequelize');

class PaymentConfigurationRepository {
    /**
     * Busca todas las configuraciones de pago de una sucursal con sus detalles de tipo de pago
     * y las cuentas de pago asociadas.
     */
    static async findActiveBySucursalId(sucursalId) {
        return await ConfigurationPayment.findAll({
            where: { 
                sucursal_id: sucursalId,
                is_enabled: true
            },
            include: [
                {
                    model: PaymentType,
                    as: 'payment_type',
                    where: { is_enabled: true }
                },
                {
                    model: PaymentAccount,
                    as: 'paymentAccounts',
                    where: { is_active: true },
                    required: false
                }
            ],
            order: [['sort_order', 'ASC']]
        });
    }

    /**
     * Busca todas las configuraciones de pago de una sucursal
     */
    static async findBySucursalId(sucursalId) {
        return await ConfigurationPayment.findAll({
            where: { sucursal_id: sucursalId },
            order: [['sort_order', 'ASC']]
        });
    }

    /**
     * Guarda o actualiza configuraciones de pago de forma masiva
     */
    static async bulkUpsert(payments, transaction) {
        // Para cada pago, usamos upsert (si existe actualiza, si no crea)
        // Nota: Sequelize.upsert funciona mejor con índices únicos definidos
        const promises = payments.map(payment => 
            ConfigurationPayment.upsert(payment, { transaction })
        );
        return await Promise.all(promises);
    }

    /**
     * Elimina configuraciones de pago que no estén en la lista proporcionada
     */
    static async deleteExcept(sucursalId, paymentTypeIds, transaction) {
        return await ConfigurationPayment.destroy({
            where: {
                sucursal_id: sucursalId,
                payment_type_id: {
                    [Op.notIn]: paymentTypeIds
                }
            },
            transaction
        });
    }

    /**
     * Actualiza el orden de los métodos de pago
     */
    static async updateOrders(sucursalId, orderedPayments, transaction) {
        const promises = orderedPayments.map(payment => 
            ConfigurationPayment.update(
                { sort_order: payment.sort_order, is_default: payment.is_default },
                { 
                    where: { 
                        sucursal_id: sucursalId, 
                        payment_type_id: payment.payment_type_id 
                    },
                    transaction 
                }
            )
        );
        return await Promise.all(promises);
    }
}

module.exports = PaymentConfigurationRepository;
