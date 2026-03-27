/**
 * BankTransferPaymentStrategy - Transferencia bancaria
 *
 * Flujo:
 *  1. Se valida que la sucursal tenga cuenta bancaria configurada en PaymentAccount
 *  2. Booking PENDING, PaymentBooking PENDING
 *  3. La respuesta incluye datos bancarios de la sucursal (CCI, cuenta, banco, titular)
 *  4. El cliente transfiere y proporciona el número de operación
 *  5. Admin confirma con PUT /:id/confirm-cash (flujo unificado de confirmación)
 *
 * Tiempo de procesamiento: 1–24 horas según banco
 */
const BasePaymentStrategy = require('./BasePaymentStrategy');
const { BadRequestError } = require('../../../shared/errors/CustomErrors');

class BankTransferPaymentStrategy extends BasePaymentStrategy {
    async validate(data, sucursalConfig) {
        if (!sucursalConfig) {
            throw new BadRequestError('No se encontró configuración para esta sucursal.');
        }
        if (!sucursalConfig.paymentAccount?.bank_account_cci && !sucursalConfig.paymentAccount?.account_number) {
            throw new BadRequestError(
                'Esta sucursal no tiene configurada una cuenta bancaria. ' +
                'Contacta al administrador para habilitar este método de pago.'
            );
        }
    }

    async process(data, createdBookings, _transaction, sucursalConfig) {
        const { total_amount, bookings: bookingsInput, payment_details } = data;
        const amount = total_amount || (bookingsInput || []).reduce((s, b) => s + Number(b.total_amount), 0);
        const account = sucursalConfig.paymentAccount;

        const operationNumber = payment_details?.operation_number
            || payment_details?.transfer_operation_number
            || `BANK-${Date.now()}`;

        const paymentProof = data.payment_proof
            || payment_details?.payment_proof
            || payment_details?.proof_url
            || null;

        return {
            status: 'PENDING',
            transactionId: operationNumber,
            gateway: 'BANK_TRANSFER',
            comision: 0,
            paymentMethod: 'ONLINE',
            amount,
            gatewayResponse: {
                gateway_provider: 'BANK_TRANSFER',
                bank_name:      account?.bank_name         || null,
                account_holder: account?.account_name      || null,
                account_number: account?.account_number    || null,
                account_cci:    account?.bank_account_cci  || null,
                account_type:   account?.bank_account_type || null,
                currency:       account?.bank_currency     || 'PEN',
                amount_to_transfer: amount,
                payment_proof: paymentProof,
                operation_number: operationNumber,
                instructions: `Transfiere S/ ${amount.toFixed(2)} a la cuenta ${account?.bank_account_cci || account?.account_number} del banco ${account?.bank_name || ''}. Luego envía el número de operación.`,
                processing_time: '1-24 horas según tu banco',
                associated_bookings: createdBookings.map(b => b.booking_id)
            },
            extraFields: {
                payment_date: null,
                payment_reference: operationNumber,
                contact_phone: data.cash_details?.contact_phone || null,
            }
        };
    }
}

module.exports = BankTransferPaymentStrategy;
