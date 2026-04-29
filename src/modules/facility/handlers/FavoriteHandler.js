/**
 * FavoriteHandler — formatea respuestas HTTP para el módulo de favoritos.
 */
const FavoriteService = require('../services/FavoriteService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

/**
 * Alterna el favorito del usuario para la sucursal indicada.
 * Retorna el nuevo estado y el conteo actualizado.
 * @param {object} res
 * @param {number} userId
 * @param {number} sucursalId
 */
const toggleFavorite = async (res, userId, sucursalId) => {
    const result = await FavoriteService.toggleFavorite(userId, sucursalId);
    const message = result.is_favorited ? 'Sucursal añadida a favoritos.' : 'Sucursal eliminada de favoritos.';
    return ApiResponse.ok(res, result, message);
};

module.exports = { toggleFavorite };
