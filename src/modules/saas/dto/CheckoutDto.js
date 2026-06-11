const Joi = require('joi');

const checkoutSessionSchema = Joi.object({
    plan_id: Joi.number().integer().positive().required(),
    billing_period: Joi.string().valid('monthly', 'yearly').required(),
    
    // Datos de la empresa
    company_name: Joi.string().min(2).max(200).required(),
    company_document: Joi.string().min(8).max(20).required(),
    company_address: Joi.string().min(5).required(),
    company_phone: Joi.string().min(6).max(20).required(),
    country_id: Joi.number().integer().positive().required(),
    ubigeo_id: Joi.number().integer().positive().required(),
    
    // Datos del dueño (super_admin)
    first_name: Joi.string().min(2).max(100).required(),
    last_name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().max(100).required(),
    password: Joi.string().min(6).max(100).required(),
    owner_phone: Joi.string().min(6).max(20).optional().allow('', null),

    // Token de tarjeta generado por MercadoPago Bricks en el frontend
    card_token_id: Joi.string().required()
});

module.exports = {
    checkoutSessionSchema
};
