// /modules/facility/controllers/FavoriteController.js
const FavoriteHandler = require('../handlers/FavoriteHandler');

// Alterna el favorito del usuario para la sucursal indicada (requiere autenticación)
const toggleFavorite = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    await FavoriteHandler.toggleFavorite(res, userId, Number(id));
};

module.exports = { toggleFavorite };
