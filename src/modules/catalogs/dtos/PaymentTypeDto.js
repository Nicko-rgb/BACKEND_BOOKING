class PaymentTypeDto {
    /**
     * Convierte un tipo de pago a formato de respuesta
     * @param {Object} paymentType - Objeto tipo de pago
     * @returns {Object} Tipo de pago formateado
     */
    static toResponse(paymentType) {
        return {
            payment_type_id: paymentType.payment_type_id,
            country_id: paymentType.country_id,
            name: paymentType.name,
            code: paymentType.code,
            category: paymentType.category,
            provider: paymentType.provider,
            description: paymentType.description,
            icon_url: paymentType.icon_url,
            processing_time: paymentType.processing_time,
            commission_percentage: paymentType.commission_percentage,
            fixed_commission: paymentType.fixed_commission,
            min_amount: paymentType.min_amount,
            max_amount: paymentType.max_amount
        };
    }

    /**
     * Convierte una lista de tipos de pago a formato de respuesta
     * @param {Array} paymentTypes - Lista de tipos de pago
     * @returns {Array} Lista de tipos de pago formateados
     */
    static toResponseList(paymentTypes) {
        return paymentTypes.map(pt => this.toResponse(pt));
    }
}

module.exports = PaymentTypeDto;
