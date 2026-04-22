/**
 * catalogsAdminDto.js
 * Schemas Joi de validación para los endpoints admin de catálogos.
 * Cada catálogo expone dos schemas: create (estricto) y update (parcial).
 */

const Joi = require('joi');

// ─── País ─────────────────────────────────────────────────────────────────────
const countryCreate = Joi.object({
    country:         Joi.string().min(2).max(100).required(),
    iso_country:     Joi.string().length(3).uppercase().required(),
    phone_code:      Joi.string().max(10).required(),
    iso_currency:    Joi.string().length(3).uppercase().required(),
    currency:        Joi.string().min(2).max(50).required(),
    currency_simbol: Joi.string().min(1).max(5).required(),
    time_zone:       Joi.string().min(3).max(50).required(),
    language:        Joi.string().min(2).max(10).required(),
    date_format:     Joi.string().min(3).max(20).required(),
    flag_url:        Joi.string().uri().max(255).required(),
});
const countryUpdate = countryCreate.fork(Object.keys(countryCreate.describe().keys), s => s.optional());

// ─── Tipo de deporte / Categoría / Superficie ────────────────────────────────
// Los tres comparten la misma forma mínima: code + name.
const sportLike = Joi.object({
    code: Joi.string().min(2).max(32).uppercase().pattern(/^[A-Z0-9_]+$/).required(),
    name: Joi.string().min(2).max(64).required(),
});
const sportLikeUpdate = sportLike.fork(['code', 'name'], s => s.optional());

// ─── Tipo de pago ────────────────────────────────────────────────────────────
const paymentCategories = [
    'tarjeta_credito', 'tarjeta_debito', 'transferencia_bancaria',
    'billetera_digital', 'efectivo', 'criptomoneda'
];
const paymentTypeCreate = Joi.object({
    country_id:            Joi.number().integer().positive().required(),
    name:                  Joi.string().min(2).max(100).required(),
    code:                  Joi.string().min(2).max(50).uppercase().pattern(/^[A-Z0-9_]+$/).required(),
    category:              Joi.string().valid(...paymentCategories).required(),
    provider:              Joi.string().max(100).allow('', null),
    description:           Joi.string().max(1000).allow('', null),
    icon_url:              Joi.string().uri().max(255).allow('', null),
    processing_time:       Joi.string().max(50).allow('', null),
    commission_percentage: Joi.number().precision(4).min(0).max(1).default(0),
    fixed_commission:      Joi.number().precision(2).min(0).default(0),
    min_amount:            Joi.number().precision(2).min(0).allow(null),
    max_amount:            Joi.number().precision(2).min(0).allow(null),
    api_config:            Joi.object().allow(null),
});
const paymentTypeUpdate = paymentTypeCreate.fork(
    ['country_id', 'name', 'code', 'category'],
    s => s.optional()
);

// ─── Ubigeo ──────────────────────────────────────────────────────────────────
const ubigeoCreate = Joi.object({
    country_id: Joi.number().integer().positive().required(),
    parent_id:  Joi.number().integer().positive().allow(null).default(null),
    level:      Joi.number().integer().min(1).max(5).required(),
    code:       Joi.string().min(1).max(20).required(),
    name:       Joi.string().min(2).max(100).required(),
});
const ubigeoUpdate = ubigeoCreate.fork(
    ['country_id', 'parent_id', 'level', 'code', 'name'],
    s => s.optional()
);

module.exports = {
    country:        { create: countryCreate,     update: countryUpdate },
    sportType:      { create: sportLike,         update: sportLikeUpdate },
    sportCategory:  { create: sportLike,         update: sportLikeUpdate },
    surfaceType:    { create: sportLike,         update: sportLikeUpdate },
    paymentType:    { create: paymentTypeCreate, update: paymentTypeUpdate },
    ubigeo:         { create: ubigeoCreate,      update: ubigeoUpdate },
};
