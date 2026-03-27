/**
 * BasePaymentStrategy - Clase base abstracta para todas las estrategias de pago
 *
 * Cada método de pago (CASH, YAPE, PLIN, BANK_TRANSFER, CARD_ONLINE) implementa
 * esta interfaz con su propia lógica de validación y procesamiento.
 *
 * Contrato que toda estrategia debe respetar:
 *  - validate(data, sucursalConfig)   → lanza error si los datos no son válidos
 *  - process(data, createdBookings, transaction) → retorna PaymentResult
 *
 * @typedef {Object} PaymentResult
 * @property {string}  status          - 'PAID' | 'PENDING'
 * @property {string}  transactionId   - ID de transacción (real o generado)
 * @property {Object}  gatewayResponse - Respuesta cruda del gateway
 * @property {string}  gateway         - Nombre del gateway usado
 * @property {number}  comision        - Monto de comisión aplicada
 * @property {string}  paymentMethod   - 'ONLINE' | 'IN_PERSON'
 * @property {Object}  [extraFields]   - Campos adicionales para PaymentBooking (Yape, cash, etc.)
 */
class BasePaymentStrategy {
    /**
     * Valida que el request tenga los datos necesarios para este método de pago.
     * Debe lanzar BadRequestError si algo falta.
     *
     * @param {Object} data             - Datos completos del request
     * @param {Object} sucursalConfig   - Configuración de la sucursal (Configuration record)
     */
    // eslint-disable-next-line no-unused-vars
    async validate(data, sucursalConfig) {
        throw new Error(`validate() no implementado en ${this.constructor.name}`);
    }

    /**
     * Procesa el pago y retorna el resultado.
     *
     * @param {Object}   data             - Datos del request
     * @param {Array}    createdBookings   - Reservas ya creadas en la BD (dentro de transaction)
     * @param {Object}   transaction       - Transacción Sequelize activa
     * @returns {Promise<PaymentResult>}
     */
    // eslint-disable-next-line no-unused-vars
    async process(data, createdBookings, transaction) {
        throw new Error(`process() no implementado en ${this.constructor.name}`);
    }

    /**
     * Helper: calcula la comisión de una estrategia dado el monto y el PaymentType
     * @param {number} amount
     * @param {Object} paymentType  - registro de PaymentType con commission_percentage y fixed_commission
     * @returns {number}
     */
    calcComision(amount, paymentType) {
        if (!paymentType) return 0;
        const pct = parseFloat(paymentType.commission_percentage || 0);
        const fixed = parseFloat(paymentType.fixed_commission || 0);
        return parseFloat((amount * pct + fixed).toFixed(2));
    }
}

module.exports = BasePaymentStrategy;
