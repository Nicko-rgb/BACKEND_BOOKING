const PaymentTypeRepository = require('../repositories/PaymentTypeRepository');
const PaymentTypeDto = require('../dtos/PaymentTypeDto');
const redisClient = require('../../../config/redisConfig');

const CACHE_TTL = 1800; // 30 minutos — pueden cambiar si el admin habilita/deshabilita métodos

class PaymentTypeService {
    /**
     * Obtiene tipos de pago habilitados por país.
     * Cache por countryId — 30 minutos.
     * @param {number} countryId - ID del país
     * @returns {Promise<Array>} Lista de tipos de pago
     */
    static async getPaymentTypesByCountry(countryId) {
        const CACHE_KEY = `catalog:payment_types:${countryId}`;
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const paymentTypes = await PaymentTypeRepository.findByCountry(countryId);
        const data = PaymentTypeDto.toResponseList(paymentTypes);
        await redisClient.set(CACHE_KEY, data, CACHE_TTL);
        return data;
    }

    /**
     * Obtiene todos los tipos de pago habilitados.
     * Cache de 30 minutos.
     * @returns {Promise<Array>} Lista de tipos de pago
     */
    static async getAllPaymentTypes() {
        const CACHE_KEY = 'catalog:payment_types';
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const paymentTypes = await PaymentTypeRepository.findAllEnabled();
        const data = PaymentTypeDto.toResponseList(paymentTypes);
        await redisClient.set(CACHE_KEY, data, CACHE_TTL);
        return data;
    }
}

module.exports = PaymentTypeService;
