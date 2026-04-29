/**
 * FavoriteService — lógica de negocio para favoritos de usuario.
 */
const FavoriteRepository = require('../repository/FavoriteRepository');

/**
 * Alterna el estado de favorito de un usuario para una sucursal.
 * Si existe lo elimina; si no existe lo crea.
 * @param {number} userId
 * @param {number} sucursalId
 * @returns {{ is_favorited: boolean, favorites_count: number }}
 */
const toggleFavorite = async (userId, sucursalId) => {
    const existing = await FavoriteRepository.findByUserAndSucursal(userId, sucursalId);

    if (existing) {
        await FavoriteRepository.remove(userId, sucursalId);
    } else {
        await FavoriteRepository.create(userId, sucursalId);
    }

    const favorites_count = await FavoriteRepository.countBySucursal(sucursalId);
    return { is_favorited: !existing, favorites_count: Number(favorites_count) };
};

/**
 * Retorna el conteo de favoritos de una sucursal y si el usuario actual la marcó.
 * Diseñado para enriquecer el detalle público de una sucursal.
 * @param {number|null} userId — null si el usuario no está autenticado
 * @param {number} sucursalId
 * @returns {{ favorites_count: number, is_favorited: boolean }}
 */
const getFavoriteStatus = async (userId, sucursalId) => {
    const favorites_count = Number(await FavoriteRepository.countBySucursal(sucursalId));
    const is_favorited = userId
        ? !!(await FavoriteRepository.findByUserAndSucursal(userId, sucursalId))
        : false;

    return { favorites_count, is_favorited };
};

module.exports = { toggleFavorite, getFavoriteStatus };
