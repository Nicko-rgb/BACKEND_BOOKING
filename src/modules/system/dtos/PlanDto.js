const Joi = require('joi');

const create = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(50).uppercase().required(),
    price_monthly: Joi.number().precision(2).min(0).required(),
    price_yearly: Joi.number().precision(2).min(0).required(),
    max_subsidiaries: Joi.number().integer().min(1).required(),
    max_spaces: Joi.number().integer().min(1).required(),
    max_users: Joi.number().integer().min(1).required(),
    has_stripe_connect: Joi.boolean().default(false),
    features: Joi.array().items(Joi.string()).allow(null),
    is_active: Joi.boolean().default(true),
});

const update = Joi.object({
    name: Joi.string().min(2).max(100),
    code: Joi.string().min(2).max(50).uppercase(),
    price_monthly: Joi.number().precision(2).min(0),
    price_yearly: Joi.number().precision(2).min(0),
    max_subsidiaries: Joi.number().integer().min(1),
    max_spaces: Joi.number().integer().min(1),
    max_users: Joi.number().integer().min(1),
    has_stripe_connect: Joi.boolean(),
    features: Joi.array().items(Joi.string()).allow(null),
    is_active: Joi.boolean(),
}).min(1);

module.exports = { create, update };
