/**
 * CashPaymentStrategy - Pago en efectivo presencial
 *
 * Flujo:
 *  1. Booking queda en PENDING (no cobrado aún)
 *  2. PaymentBooking en PENDING con fecha/hora/teléfono comprometidos
 *  3. Admin confirma cobro vía PUT /:id/confirm-cash → CONFIRMED + PAID
 *
 * Cuando viene de admin (is_admin_create=true):
 *  - Booking y PaymentBooking quedan directamente en CONFIRMED/PAID
 */
const BasePaymentStrategy = require('./BasePaymentStrategy');

class CashPaymentStrategy extends BasePaymentStrategy {
    async validate(data) {
        // Si no es admin, el cliente debe comprometerse con fecha/hora de pago
        if (!data.is_admin_create) {
            const { cash_details } = data;
            if (!cash_details) {
                const { BadRequestError } = require('../../../shared/errors/CustomErrors');
                throw new BadRequestError('Para pago en efectivo debes indicar cash_details (scheduled_payment_date, scheduled_payment_time, contact_phone).');
            }
        }
    }

    async process(data, createdBookings) {
        const { cash_details, is_admin_create, total_amount, bookings: bookingsInput } = data;
        const isByAdmin = !!is_admin_create;

        const amount = total_amount || (bookingsInput || []).reduce((s, b) => s + Number(b.total_amount), 0);

        // payment_date, cash_received_by y cash_received_at se asignan
        // cuando el admin confirma el cobro (confirmCashPayment), no al crear
        return {
            status: 'PENDING',
            transactionId: isByAdmin ? `CASH-ADMIN-${Date.now()}` : null,
            gatewayResponse: null,
            gateway: 'CASH',
            comision: 0,
            paymentMethod: 'IN_PERSON',
            amount,
            extraFields: {
                payment_date: null,
                scheduled_payment_date: cash_details?.scheduled_payment_date || null,
                scheduled_payment_time: cash_details?.scheduled_payment_time || null,
                contact_phone: cash_details?.contact_phone || null,
                cash_received_by: null,
                cash_received_at: null,
            }
        };
    }
}

module.exports = CashPaymentStrategy;
