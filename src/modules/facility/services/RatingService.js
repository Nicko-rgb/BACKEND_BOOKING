/**
 * RatingService — lógica de negocio para calificaciones y reseñas.
 */
const RatingRepository = require('../repository/RatingRepository');
const { ConflictError } = require('../../../shared/errors/CustomErrors');

/**
 * Retorna las últimas 6 reseñas aprobadas de una sucursal.
 * @param {number} sucursalId
 */
const getApprovedRatings = async (sucursalId) => {
    return await RatingRepository.findApprovedBySucursal(sucursalId, 6);
};

/**
 * Crea una calificación para una sucursal.
 * Valida que el usuario no haya calificado antes esta sucursal.
 * @param {number} userId
 * @param {number} sucursalId
 * @param {object} data — { score, comment, title, would_recommend }
 */
const createRating = async (userId, sucursalId, data) => {
    const existing = await RatingRepository.findByUserAndSucursal(userId, sucursalId);
    if (existing) throw new ConflictError('Ya has calificado esta sucursal.');

    return await RatingRepository.create({
        ...data,
        user_id: userId,
        sucursal_id: sucursalId,
        // Aprobada directo hasta que se implemente moderación ──────────────────
        status: 'aprobada',
        rated_at: new Date()
    });
};

module.exports = { getApprovedRatings, createRating };
