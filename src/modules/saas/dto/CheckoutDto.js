const Joi = require('joi');

const checkoutSessionSchema = Joi.object({
    plan_id:          Joi.number().integer().positive().required(),
    billing_period:   Joi.string().valid('monthly', 'yearly').required(),

    // Empresa
    company_name:     Joi.string().min(2).max(200).required(),
    company_document: Joi.string().min(8).max(20).required(),
    company_address:  Joi.string().min(5).required(),
    company_phone:    Joi.string().min(6).max(20).required(),
    country_id:       Joi.number().integer().positive().required(),
    ubigeo_id:        Joi.number().integer().positive().required(),

    // Dueño (super_admin)
    first_name:       Joi.string().min(2).max(100).required(),
    last_name:        Joi.string().min(2).max(100).required(),
    email:            Joi.string().email().max(100).required(),
    password:         Joi.string().min(6).max(100).required(),
    owner_phone:      Joi.string().min(6).max(20).optional().allow('', null),

    // Pago — generados por CardPayment Brick de MercadoPago
    card_token_id:     Joi.string().required(),
    payment_method_id: Joi.string().required(),
    installments:      Joi.number().integer().min(1).default(1)
});

module.exports = { checkoutSessionSchema };
