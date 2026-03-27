const { Country } = require('../models');

class CountryRepository {
    /**
     * Obtiene todos los países
     * @returns {Promise<Array>} Lista de países
     */
    static async findAll() {
        try {
            return await Country.findAll({
                order: [['country', 'ASC']]
            });
        } catch (error) {
            throw new Error(`Error al obtener países: ${error.message}`);
        }
    }
}

module.exports = CountryRepository;