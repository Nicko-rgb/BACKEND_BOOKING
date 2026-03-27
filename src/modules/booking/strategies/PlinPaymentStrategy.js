/**
 * PlinPaymentStrategy - Pago con billetera digital Plin (Interbank/BBVA/Scotiabank)
 *
 * Flujo idéntico al de Yape: manual con confirmación del admin.
 * La sucursal configura su cuenta Plin en PaymentAccount.
 */
const BasePaymentStrategy = require('./BasePaymentStrategy');
const { BadRequestError } = require('../../../shared/errors/CustomErrors');

class PlinPaymentStrategy extends BasePaymentStrategy {
    async validate(data, sucursalConfig) {
        if (!sucursalConfig) {
            throw new BadRequestError('No se encontró configuración para esta sucursal.');
        }
        if (!sucursalConfig.paymentAccount?.account_number) {
            throw new BadRequestError(
                'Esta sucursal no tiene configurado un número Plin. ' +
                'Contacta al administrador para habilitar este método de pago.'
            );
        }
    }

    async process(data, createdBookings, _transaction, sucursalConfig) {
        const { total_amount, bookings: bookingsInput, payment_details } = data;
        const amount = total_amount || (bookingsInput || []).reduce((s, b) => s + Number(b.total_amount), 0);
        const account = sucursalConfig.paymentAccount;

        const paymentProof = data.payment_proof
            || payment_details?.payment_proof
            || payment_details?.proof_url
            || null;

        const transactionRef = payment_details?.plin_operation_number
            || payment_details?.operation_number
            || `PLIN-${Date.now()}`;

        return {
            status: 'PENDING',
            transactionId: transactionRef,
            gateway: 'PLIN',
            comision: 0,
            paymentMethod: 'ONLINE',
            amount,
            gatewayResponse: {
                gateway_provider: 'PLIN',
                sucursal_plin_number: account?.account_number || null,
                sucursal_plin_name:   account?.account_name  || null,
                sucursal_plin_qr:     account?.qr_url        || null,
                amount_to_transfer: amount,
                payment_proof: paymentProof,
                operation_number: transactionRef,
                instructions: `Plínea S/ ${amount.toFixed(2)} al número ${account?.account_number}`,
                associated_bookings: createdBookings.map(b => b.booking_id)
            },
            extraFields: {
                payment_date: null,
                payment_reference: transactionRef,
                contact_phone: data.cash_details?.contact_phone || null,
            }
        };
    }
}

module.exports = PlinPaymentStrategy;
