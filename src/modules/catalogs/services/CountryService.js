const CountryRepository = require('../repositories/CountryRepository');
const CountryDto = require('../dtos/CountryDto');
const redisClient = require('../../../config/redisConfig');

const CACHE_KEY = 'catalog:countries';
const CACHE_TTL = 3600; // 1 hora — los países raramente cambian

class CountryService {
    /**
     * Obtiene todos los países.
     * Cache de 1 hora en Redis.
     * @returns {Promise<Array>} Lista de países
     */
    static async getAllCountries() {
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) return cached;

        const countries = await CountryRepository.findAll();
        const data = CountryDto.toSelectOptionList(countries);
        await redisClient.set(CACHE_KEY, data, CACHE_TTL);
        return data;
    }
}

module.exports = CountryService;
