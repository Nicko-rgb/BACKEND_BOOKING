const CommonCatalogRepository = require('../repositories/CommonCatalogRepository');
const redisClient = require('../../../config/redisConfig');

// TTL para datos de catálogo — cambian muy raramente
const CATALOG_TTL = 3600; // 1 hora

class CommonCatalogService {
    /**
     * Obtiene todos los tipos de deporte.
     * Cache de 1 hora — los tipos de deporte raramente cambian.
     */
    static async getSportTypes() {
        const CACHE_KEY = 'catalog:sport_types';
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const data = await CommonCatalogRepository.findAllSportTypes();
        await redisClient.set(CACHE_KEY, data, CATALOG_TTL);
        return data;
    }

    /**
     * Obtiene todos los tipos de superficie.
     * Cache de 1 hora.
     */
    static async getSurfaceTypes() {
        const CACHE_KEY = 'catalog:surface_types';
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const data = await CommonCatalogRepository.findAllSurfaceTypes();
        await redisClient.set(CACHE_KEY, data, CATALOG_TTL);
        return data;
    }

    /**
     * Obtiene todas las categorías de deporte.
     * Cache de 1 hora.
     */
    static async getSportCategories() {
        const CACHE_KEY = 'catalog:sport_categories';
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const data = await CommonCatalogRepository.findAllSportCategories();
        await redisClient.set(CACHE_KEY, data, CATALOG_TTL);
        return data;
    }

    /**
     * Obtiene ubigeos de nivel 1 (departamentos) por país.
     * Cache por countryId — 1 hora.
     * @param {number} countryId
     */
    static async getUbigeoByCountry(countryId) {
        const CACHE_KEY = `catalog:ubigeo:country:${countryId}`;
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const data = await CommonCatalogRepository.findUbigeoByCountry(countryId);
        await redisClient.set(CACHE_KEY, data, CATALOG_TTL);
        return data;
    }

    /**
     * Obtiene ubigeos hijos de un padre (provincias, distritos).
     * Cache por parentId — 1 hora.
     * @param {number} parentId
     */
    static async getUbigeoByParent(parentId) {
        const CACHE_KEY = `catalog:ubigeo:parent:${parentId}`;
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const data = await CommonCatalogRepository.findUbigeoByParent(parentId);
        await redisClient.set(CACHE_KEY, data, CATALOG_TTL);
        return data;
    }
}

module.exports = CommonCatalogService;
