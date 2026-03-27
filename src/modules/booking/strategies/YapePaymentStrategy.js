/**
 * YapePaymentStrategy - Pago con billetera digital Yape (BCP)
 *
 * Flujo MVP (sin API directa de Yape, que requiere contrato empresarial con BCP):
 *  1. Se valida que la sucursal tenga un número Yape configurado
 *  2. Booking queda PENDING, PaymentBooking PENDING
 *  3. La respuesta incluye el número Yape de la sucursal y el monto a transferir
 *  4. El cliente transfiere y opcionalmente sube captura como payment_proof
 *  5. Admin verifica y confirma vía PUT /:id/confirm-cash (flujo unificado de confirmación)
 *
 * Escalabilidad futura: cuando se tenga API de Yape o integración con Culqi/Izipay,
 * solo se reemplaza este archivo sin tocar BookingService ni rutas.
 */
const BasePaymentStrategy = require('./BasePaymentStrategy');
const { BadRequestError } = require('../../../shared/errors/CustomErrors');

class YapePaymentStrategy extends BasePaymentStrategy {
    async validate(data, sucursalConfig) {
        if (!sucursalConfig) {
            throw new BadRequestError('No se encontró configuración para esta sucursal.');
        }
        if (!sucursalConfig.paymentAccount?.account_number) {
            throw new BadRequestError(
                'Esta sucursal no tiene configurado un número Yape. ' +
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

        const transactionRef = payment_details?.yape_operation_number
            || payment_details?.operation_number
            || `YAPE-${Date.now()}`;

        return {
            status: 'PENDING',
            transactionId: transactionRef,
            gateway: 'YAPE',
            comision: 0,
            paymentMethod: 'ONLINE',
            amount,
            gatewayResponse: {
                gateway_provider: 'YAPE',
                sucursal_yape_number: account?.account_number || null,
                sucursal_yape_name:   account?.account_name  || null,
                sucursal_yape_qr:     account?.qr_url        || null,
                amount_to_transfer: amount,
                payment_proof: paymentProof,
                operation_number: transactionRef,
                instructions: `Yapea S/ ${amount.toFixed(2)} al número ${account?.account_number}`,
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

module.exports = YapePaymentStrategy;
