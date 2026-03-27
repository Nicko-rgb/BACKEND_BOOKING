/**
 * PaymentStrategyFactory - Fábrica de estrategias de pago
 *
 * Resuelve la estrategia correcta según el payment_method_code recibido en el request.
 * Para agregar un nuevo método de pago: crear su Strategy y registrarlo aquí.
 *
 * Uso:
 *   const strategy = PaymentStrategyFactory.resolve('YAPE');
 *   await strategy.validate(data, sucursalConfig);
 *   const result = await strategy.process(data, bookings, transaction, sucursalConfig, paymentType);
 */
const CashPaymentStrategy = require('./CashPaymentStrategy');
const YapePaymentStrategy = require('./YapePaymentStrategy');
const PlinPaymentStrategy = require('./PlinPaymentStrategy');
const BankTransferPaymentStrategy = require('./BankTransferPaymentStrategy');
const CardOnlinePaymentStrategy = require('./CardOnlinePaymentStrategy');
const { BadRequestError } = require('../../../shared/errors/CustomErrors');

// Mapa de código → instancia de estrategia (singleton por estrategia)
const STRATEGIES = {
    CASH:          new CashPaymentStrategy(),
    YAPE:          new YapePaymentStrategy(),
    PLIN:          new PlinPaymentStrategy(),
    BANK_TRANSFER: new BankTransferPaymentStrategy(),
    CARD_ONLINE:   new CardOnlinePaymentStrategy(),
};

class PaymentStrategyFactory {
    /**
     * Devuelve la estrategia correspondiente al código de pago.
     * Lanza BadRequestError si el código no existe.
     *
     * @param {string} paymentMethodCode - Ej: 'YAPE', 'CASH', 'CARD_ONLINE'
     * @returns {BasePaymentStrategy}
     */
    static resolve(paymentMethodCode) {
        // Admin create siempre usa CASH internamente
        const code = String(paymentMethodCode || '').toUpperCase();
        const strategy = STRATEGIES[code];

        if (!strategy) {
            throw new BadRequestError(
                `Método de pago '${code}' no reconocido. ` +
                `Métodos disponibles: ${Object.keys(STRATEGIES).join(', ')}`
            );
        }

        return strategy;
    }

    /**
     * Devuelve la lista de códigos de pago disponibles
     * @returns {string[]}
     */
    static availableCodes() {
        return Object.keys(STRATEGIES);
    }
}

module.exports = PaymentStrategyFactory;
