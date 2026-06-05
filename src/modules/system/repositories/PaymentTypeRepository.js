const { PaymentType } = require('../models');

class PaymentTypeRepository {
    /**
     * Obtiene todos los tipos de pago por país
     * @param {number} countryId - ID del país
     * @returns {Promise<Array>} Lista de tipos de pago
     */
    static async findByCountry(countryId) {
        return await PaymentType.findAll({
            where: { 
                country_id: countryId,
                is_enabled: true 
            },
            order: [['payment_type_id', 'ASC']]
        });
    }

    /**
     * Obtiene todos los tipos de pago habilitados
     * @returns {Promise<Array>} Lista de tipos de pago
     */
    static async findAllEnabled() {
        return await PaymentType.findAll({
            where: { is_enabled: true },
            order: [['name', 'ASC']]
        });
    }
}

module.exports = PaymentTypeRepository;
