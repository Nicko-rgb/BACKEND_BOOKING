const CountryRepository = require('../repositories/CountryRepository');
const CountryDto = require('../dtos/CountryDto');

class CountryService {
    /**
     * Obtiene todos los países
     * @returns {Promise<Array>} Lista de países
     */
    static async getAllCountries() {
        try {
            const countries = await CountryRepository.findAll();
            return CountryDto.toSelectOptionList(countries);
        } catch (error) {
            throw new Error(`Error en el servicio de países: ${error.message}`);
        }
    }
}

module.exports = CountryService;