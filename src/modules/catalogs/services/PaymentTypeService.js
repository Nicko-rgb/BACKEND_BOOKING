const PaymentTypeRepository = require('../repositories/PaymentTypeRepository');
const PaymentTypeDto = require('../dtos/PaymentTypeDto');

class PaymentTypeService {
    /**
     * Obtiene tipos de pago por país
     * @param {number} countryId - ID del país
     * @returns {Promise<Array>} Lista de tipos de pago
     */
    static async getPaymentTypesByCountry(countryId) {
        const paymentTypes = await PaymentTypeRepository.findByCountry(countryId);
        return PaymentTypeDto.toResponseList(paymentTypes);
    }

    /**
     * Obtiene todos los tipos de pago habilitados
     * @returns {Promise<Array>} Lista de tipos de pago
     */
    static async getAllPaymentTypes() {
        const paymentTypes = await PaymentTypeRepository.findAllEnabled();
        return PaymentTypeDto.toResponseList(paymentTypes);
    }
}

module.exports = PaymentTypeService;
