/**
 * FavoriteRepository — acceso a datos de favoritos de usuario.
 * Opera sobre la tabla dsg_bss_user_favorites.
 */
const { UserFavorite } = require('../../users/models');

/**
 * Busca el registro de favorito de un usuario para una sucursal.
 * @param {number} userId
 * @param {number} sucursalId
 * @returns {UserFavorite|null}
 */
const findByUserAndSucursal = async (userId, sucursalId) => {
    return await UserFavorite.findOne({
        where: { user_id: userId, sucursal_id: sucursalId }
    });
};

/**
 * Crea un registro de favorito.
 * @param {number} userId
 * @param {number} sucursalId
 */
const create = async (userId, sucursalId) => {
    return await UserFavorite.create({ user_id: userId, sucursal_id: sucursalId });
};

/**
 * Elimina el registro de favorito de un usuario para una sucursal.
 * @param {number} userId
 * @param {number} sucursalId
 */
const remove = async (userId, sucursalId) => {
    return await UserFavorite.destroy({
        where: { user_id: userId, sucursal_id: sucursalId }
    });
};

/**
 * Cuenta el total de favoritos de una sucursal.
 * @param {number} sucursalId
 * @returns {number}
 */
const countBySucursal = async (sucursalId) => {
    return await UserFavorite.count({
        where: { sucursal_id: sucursalId }
    });
};

module.exports = { findByUserAndSucursal, create, remove, countBySucursal };
