const CommonCatalogRepository = require('../repositories/CommonCatalogRepository');

class CommonCatalogService {
    /**
     * Obtiene todos los tipos de deporte
     */
    static async getSportTypes() {
        return await CommonCatalogRepository.findAllSportTypes();
    }

    /**
     * Obtiene todos los tipos de superficie
     */
    static async getSurfaceTypes() {
        return await CommonCatalogRepository.findAllSurfaceTypes();
    }

    /**
     * Obtiene todas las categorías de deporte
     */
    static async getSportCategories() {
        return await CommonCatalogRepository.findAllSportCategories();
    }

    /**
     * Obtiene ubigeos de nivel 1 (departamentos) por país
     * @param {number} countryId
     */
    static async getUbigeoByCountry(countryId) {
        return await CommonCatalogRepository.findUbigeoByCountry(countryId);
    }

    /**
     * Obtiene ubigeos hijos de un padre
     * @param {number} parentId
     */
    static async getUbigeoByParent(parentId) {
        return await CommonCatalogRepository.findUbigeoByParent(parentId);
    }
}

module.exports = CommonCatalogService;
