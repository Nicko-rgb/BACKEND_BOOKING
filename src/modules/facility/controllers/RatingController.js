// /modules/facility/controllers/RatingController.js
const RatingHandler = require('../handlers/RatingHandler');

// Obtiene las últimas reseñas aprobadas de una sucursal
const getApprovedRatings = async (req, res) => {
    const { id } = req.params;
    await RatingHandler.getApprovedRatings(res, Number(id));
};

// Crea una reseña para la sucursal (requiere autenticación)
const createRating = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    await RatingHandler.createRating(res, userId, Number(id), req.validatedData);
};

module.exports = { getApprovedRatings, createRating };
