const CommonCatalogService = require('../services/CommonCatalogService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

/**
 * Handler para catálogos comunes (deportes, superficies, categorías)
 */
const getSportTypes = async (req, res) => {
    const data = await CommonCatalogService.getSportTypes();
    return ApiResponse.ok(res, data, 'Tipos de deporte obtenidos exitosamente');
};

const getSurfaceTypes = async (req, res) => {
    const data = await CommonCatalogService.getSurfaceTypes();
    return ApiResponse.ok(res, data, 'Tipos de superficie obtenidos exitosamente');
};

const getSportCategories = async (req, res) => {
    const data = await CommonCatalogService.getSportCategories();
    return ApiResponse.ok(res, data, 'Categorías de deporte obtenidas exitosamente');
};

/**
 * Retorna ubigeos de nivel 1 por country_id O hijos por parent_id.
 * Query params: country_id (para nivel 1) | parent_id (para niveles 2+)
 */
const getUbigeo = async (req, res) => {
    const { country_id, parent_id } = req.query;
    let data;
    // Si viene parent_id cargamos los hijos (provincias o distritos) ──────
    if (parent_id) {
        data = await CommonCatalogService.getUbigeoByParent(parent_id);
    } else {
        // Sin parent_id cargamos nivel 1 del país (departamentos) ─────────
        data = await CommonCatalogService.getUbigeoByCountry(country_id);
    }
    return ApiResponse.ok(res, data, 'Datos geográficos obtenidos exitosamente');
};

module.exports = {
    getSportTypes,
    getSurfaceTypes,
    getSportCategories,
    getUbigeo
};
