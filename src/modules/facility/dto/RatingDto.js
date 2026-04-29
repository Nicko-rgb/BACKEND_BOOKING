/**
 * RatingDto — validación de entrada para el endpoint de creación de reseñas.
 */
const Joi = require('joi');

// Schema para crear una calificación desde la página de detalle de sucursal ────
const createRatingDto = Joi.object({
    score: Joi.number().integer().min(1).max(5).required().messages({
        'number.min': 'La puntuación mínima es 1',
        'number.max': 'La puntuación máxima es 5',
        'any.required': 'La puntuación es obligatoria'
    }),
    comment: Joi.string().max(1000).allow('', null).optional(),
    title:   Joi.string().max(200).allow('', null).optional(),
    would_recommend: Joi.boolean().optional()
});

module.exports = { createRatingDto };
