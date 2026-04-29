/**
 * RatingRepository — acceso a datos de calificaciones y reseñas.
 * Solo opera sobre la tabla dsg_bss_ratings.
 */
const { Op } = require('sequelize');
const Rating = require('../models/Rating');
const { User } = require('../../users/models');

/**
 * Obtiene las últimas N calificaciones aprobadas de una sucursal.
 * Incluye nombre del usuario para mostrar en la reseña.
 * @param {number} sucursalId
 * @param {number} limit — número máximo de resultados
 */
const findApprovedBySucursal = async (sucursalId, limit = 6) => {
    return await Rating.findAll({
        where: {
            sucursal_id: sucursalId,
            status: 'aprobada'
        },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['user_id', 'first_name', 'last_name']
            }
        ],
        order: [['rated_at', 'DESC']],
        limit
    });
};

/**
 * Verifica si un usuario ya calificó una sucursal.
 * @param {number} userId
 * @param {number} sucursalId
 * @returns {Rating|null}
 */
const findByUserAndSucursal = async (userId, sucursalId) => {
    return await Rating.findOne({
        where: { user_id: userId, sucursal_id: sucursalId }
    });
};

/**
 * Crea una nueva calificación.
 * @param {object} data — { user_id, sucursal_id, score, comment, title, would_recommend, status }
 */
const create = async (data) => {
    return await Rating.create(data);
};

module.exports = { findApprovedBySucursal, findByUserAndSucursal, create };
