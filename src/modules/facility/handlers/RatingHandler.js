/**
 * RatingHandler — formatea respuestas HTTP para el módulo de reseñas.
 */
const RatingService = require('../services/RatingService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

/**
 * Retorna las últimas 6 reseñas aprobadas de una sucursal.
 * @param {object} res
 * @param {number} sucursalId
 */
const getApprovedRatings = async (res, sucursalId) => {
    const ratings = await RatingService.getApprovedRatings(sucursalId);
    return ApiResponse.ok(res, ratings, 'Reseñas de la sucursal.');
};

/**
 * Crea una reseña para una sucursal.
 * @param {object} res
 * @param {number} userId
 * @param {number} sucursalId
 * @param {object} data — body validado por createRatingDto
 */
const createRating = async (res, userId, sucursalId, data) => {
    const rating = await RatingService.createRating(userId, sucursalId, data);
    return ApiResponse.created(res, rating, 'Reseña enviada exitosamente.');
};

module.exports = { getApprovedRatings, createRating };
