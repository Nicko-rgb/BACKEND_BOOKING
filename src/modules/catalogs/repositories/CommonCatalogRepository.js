const { SportType, SurfaceType, SportCategory, Ubigeo } = require('../models');

class CommonCatalogRepository {
    /**
     * Obtiene todos los tipos de deporte
     */
    static async findAllSportTypes() {
        return await SportType.findAll({
            attributes: [['sport_type_id', 'id'], ['name', 'label']],
            order: [['name', 'ASC']]
        });
    }

    /**
     * Obtiene todos los tipos de superficie
     */
    static async findAllSurfaceTypes() {
        return await SurfaceType.findAll({
            attributes: [['surface_type_id', 'id'], ['name', 'label']],
            order: [['name', 'ASC']]
        });
    }

    /**
     * Obtiene todas las categorías de deporte
     */
    static async findAllSportCategories() {
        return await SportCategory.findAll({
            attributes: [['sport_category_id', 'id'], ['name', 'label']],
            order: [['name', 'ASC']]
        });
    }

    /**
     * Obtiene registros ubigeo de nivel 1 (departamentos/estados) filtrados por país
     * @param {number} countryId - ID del país
     */
    static async findUbigeoByCountry(countryId) {
        return await Ubigeo.findAll({
            where: { country_id: countryId, level: 1 },
            attributes: ['ubigeo_id', 'code', 'name', 'level'],
            order: [['name', 'ASC']]
        });
    }

    /**
     * Obtiene registros ubigeo hijos de un padre (por parent_id)
     * @param {number} parentId - ubigeo_id del padre
     */
    static async findUbigeoByParent(parentId) {
        return await Ubigeo.findAll({
            where: { parent_id: parentId },
            attributes: ['ubigeo_id', 'code', 'name', 'level'],
            order: [['name', 'ASC']]
        });
    }
}

module.exports = CommonCatalogRepository;
