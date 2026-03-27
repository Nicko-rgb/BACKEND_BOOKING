/**
 * DashboardController
 * Extrae parámetros del request y delega al Handler.
 */
const InicioHandler = require('../handlers/InicioHandler');

/**
 * GET /api/reports/home?month=X&year=Y
 * Devuelve los datos de inicio según el scope del usuario autenticado.
 */
const getHomeData = async (req, res) => {
    const now   = new Date();
    // Si no se pasan month/year se usa el mes actual
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
    const year  = parseInt(req.query.year,  10) || now.getFullYear();

    await InicioHandler.getHomeData(res, req.user, month, year);
};

module.exports = { getHomeData };
