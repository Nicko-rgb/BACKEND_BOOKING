const Joi = require('joi');

/**
 * DTO para transformar y alinear las respuestas del módulo Booking
 */
class BookingDto {
    /**
     * Transforma una reserva confirmada a respuesta estandarizada
     */
    static toResponse(booking) {
        if (!booking) return null;

        return {
            booking_id: booking.booking_id,
            user_id: booking.user_id,
            space_id: booking.space_id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            total_amount: booking.total_amount,
            payment_method: booking.payment_method,
            status: booking.status,
            space: booking.space ? {
                space_id: booking.space.space_id,
                name: booking.space.name,
                sucursal_id: booking.space.sucursal_id
            } : null,
            user: booking.user ? {
                user_id: booking.user.user_id,
                name: booking.user.name,
                email: booking.user.email
            } : null,
            payment: booking.payment ? {
                payment_id: booking.payment.payment_id,
                amount: booking.payment.amount,
                status: booking.payment.status,
                method: booking.payment.method,
                transaction_id: booking.payment.transaction_id,
                payment_date: booking.payment.payment_date,
                // Campos de pago en efectivo
                scheduled_payment_date: booking.payment.scheduled_payment_date,
                scheduled_payment_time: booking.payment.scheduled_payment_time,
                contact_phone: booking.payment.contact_phone,
                cash_received_at: booking.payment.cash_received_at,
                cash_received_by: booking.payment.cash_received_by,
                cash_receipt_number: booking.payment.cash_receipt_number
            } : null,
            created_at: booking.created_at
        };
    }

    /**
     * Transforma un hold activo a respuesta estandarizada (para el frontend del timer)
     */
    static toHoldResponse(hold) {
        if (!hold) return null;

        return {
            booking_id: hold.booking_id,
            hold_id: hold.hold_id,
            user_id: hold.user_id,
            space_id: hold.space_id,
            start_time: hold.start_time,
            end_time: hold.end_time,
            expires_at: hold.expires_at,
            extension_count: hold.extension_count,
            extension_limit: hold.extension_limit,
            status: 'PENDING',
            type: 'reserving'
        };
    }

    /**
     * Transforma un array de holds a respuesta estandarizada
     */
    static toHoldListResponse(holds) {
        return holds.map(h => BookingDto.toHoldResponse(h));
    }
}

/**
 * Schema de validación para crear una reserva
 *
 * Soporta todos los métodos de pago: CASH, YAPE, PLIN, BANK_TRANSFER, CARD_ONLINE
 */
const createReservationDto = Joi.object({
    // ── Datos de la reserva ──────────────────────────────────────────────────
    bookings: Joi.array().items(
        Joi.object({
            space_id: Joi.number().integer().positive().required()
                .messages({ 'any.required': 'Cada reserva debe tener un espacio asignado.' }),
            booking_date: Joi.string().required()
                .messages({ 'any.required': 'La fecha de la reserva es obligatoria.' }),
            start_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required()
                .messages({
                    'any.required': 'La hora de inicio es obligatoria.',
                    'string.pattern.base': 'La hora de inicio debe tener el formato HH:mm.'
                }),
            end_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required()
                .messages({
                    'any.required': 'La hora de fin es obligatoria.',
                    'string.pattern.base': 'La hora de fin debe tener el formato HH:mm.'
                }),
            // Monto individual del slot — requerido, puede ser 0 si el admin exonera
            total_amount: Joi.number().min(0).required()
                .messages({
                    'any.required': 'El precio de cada reserva es obligatorio.',
                    'number.min': 'El precio no puede ser negativo.'
                })
        })
    ).min(1).optional()
        .messages({ 'array.min': 'Debe incluir al menos una reserva.' }),

    // Campos planos (creación desde admin)
    space_id: Joi.number().integer().positive().optional(),
    booking_date: Joi.string().optional(),
    start_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    end_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    total_amount: Joi.number().positive().optional(),
    duration: Joi.number().optional(),

    // ── Identificación ───────────────────────────────────────────────────────
    user_id: Joi.alternatives().try(Joi.number(), Joi.string()).when('is_admin_create', {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.required()
    }),
    sucursal_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    payment_method_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),

    // Código del método: CASH | YAPE | PLIN | BANK_TRANSFER | CARD_ONLINE
    payment_method_code: Joi.string().valid('CASH', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'CARD_ONLINE').required()
        .messages({
            'any.required': 'El método de pago es obligatorio.',
            'any.only': 'El método de pago seleccionado no es válido.'
        }),

    // Detalles adicionales del pago según método:
    //   CARD_ONLINE: { payment_intent_id: 'pi_xxx' }
    //   YAPE/PLIN:   { operation_number: '123456', payment_proof: 'url_o_base64' }
    //   BANK:        { operation_number: '123456', payment_proof: 'url_o_base64' }
    payment_details: Joi.object({
        payment_intent_id: Joi.string().optional(),   // Stripe
        operation_number: Joi.string().optional(),    // YAPE / PLIN / BANK
        payment_proof: Joi.string().optional(),       // URL o base64 del comprobante
        proof_url: Joi.string().uri().optional(),     // Alternativa URL
        yape_operation_number: Joi.string().optional(),
        plin_operation_number: Joi.string().optional(),
        transfer_operation_number: Joi.string().optional(),
    }).optional().unknown(true),

    // Comprobante de pago como campo de primer nivel (alternativa a payment_details.payment_proof)
    payment_proof: Joi.string().optional(),

    // ── Flags de creación administrativa ─────────────────────────────────────
    is_admin_create: Joi.boolean().optional(),
    admin_id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
    client_name: Joi.string().optional(),
    client_last_name: Joi.string().optional(),
    document_number: Joi.string().optional(),
    phone: Joi.string().optional(),
    // tlds: false permite emails con dominios internos (ej: inv.12345@invitado.com)
    email: Joi.string().email({ tlds: { allow: false } }).optional().allow('')
        .messages({ 'string.email': 'El email ingresado no tiene un formato válido.' }),
    status: Joi.string().optional(),

    // ── Datos de pago en efectivo / compromiso de pago manual ─────────────────
    // Aplica a CASH (obligatorio), YAPE, PLIN, BANK_TRANSFER (opcionales para contact_phone)
    cash_details: Joi.when('is_admin_create', {
        is: true,
        then: Joi.object().optional(),
        otherwise: Joi.when('payment_method_code', {
            is: 'CASH',
            then: Joi.object({
                scheduled_payment_date: Joi.string().isoDate().required(),
                scheduled_payment_time: Joi.string().max(30).required(),
                contact_phone: Joi.string().min(7).max(20).required()
            }).required(),
            otherwise: Joi.object({
                contact_phone: Joi.string().min(7).max(20).optional()
            }).optional()
        })
    }),

    tenant_id: Joi.string().optional(),
    user_create: Joi.alternatives().try(Joi.number(), Joi.string()).optional()

}).or('bookings', 'space_id');

/**
 * Schema de validación para crear un hold
 */
const createHoldDto = Joi.object({
    space_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    user_id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
    bookings: Joi.array().items(
        Joi.object({
            booking_date: Joi.string().isoDate().required(),
            start_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required(),
            end_time: Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).required()
        })
    ).min(1).required()
});

module.exports = { BookingDto, createReservationDto, createHoldDto };
