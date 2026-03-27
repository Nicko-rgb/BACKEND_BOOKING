const Joi = require('joi');
const { ValidationError } = require('../../../shared/errors/CustomErrors');

const paymentActiveSchema = Joi.object({
    sucursal_id: Joi.number().required().messages({
        'any.required': 'El ID de la sucursal es obligatorio',
        'number.base': 'El ID de la sucursal debe ser un número'
    }),
    payment_methods: Joi.array().items(
        Joi.object({
            payment_type_id: Joi.number().required().messages({
                'any.required': 'El ID del tipo de pago es obligatorio'
            }),
            is_enabled: Joi.boolean().default(true)
        })
    ).required().min(1).messages({
        'array.min': 'Debe seleccionar al menos un método de pago',
        'any.required': 'Los métodos de pago son obligatorios'
    })
});

const paymentOrderSchema = Joi.object({
    sucursal_id: Joi.number().required(),
    ordered_payments: Joi.array().items(
        Joi.object({
            payment_type_id: Joi.number().required(),
            sort_order: Joi.number().required()
        })
    ).required()
});

module.exports = {
    paymentActiveSchema,
    paymentOrderSchema
};
