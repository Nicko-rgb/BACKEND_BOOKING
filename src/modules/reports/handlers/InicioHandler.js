/**
 * DashboardHandler
 * Orquesta la llamada al servicio y formatea la respuesta HTTP.
 */
const InicioService = require('../services/InicioService');
const ApiResponse      = require('../../../shared/utils/ApiResponse');

/**
 * Retorna los datos de la página de inicio según el scope del usuario autenticado.
 * @param {Response} res
 * @param {Object}   user  - req.user (payload JWT)
 * @param {number}   month - Mes seleccionado (1-12)
 * @param {number}   year  - Año seleccionado
 */
const getHomeData = async (res, user, month, year) => {
    const data = await InicioService.getHomeData(user, month, year);
    return ApiResponse.ok(res, data, 'Datos de inicio cargados');
};

module.exports = { getHomeData };
