const CommonCatalogHandler = require('../handlers/CommonCatalogHandler');

/**
 * Controlador para catálogos comunes
 */
const getSportTypes = async (req, res, next) => {
    await CommonCatalogHandler.getSportTypes(req, res, next);
};

const getSurfaceTypes = async (req, res, next) => {
    await CommonCatalogHandler.getSurfaceTypes(req, res, next);
};

const getSportCategories = async (req, res, next) => {
    await CommonCatalogHandler.getSportCategories(req, res, next);
};

// Ubigeo geográfico (departamentos, provincias, distritos) ─────────────────
const getUbigeo = async (req, res, next) => {
    await CommonCatalogHandler.getUbigeo(req, res, next);
};

module.exports = {
    getSportTypes,
    getSurfaceTypes,
    getSportCategories,
    getUbigeo
};
