const CountryService = require('../services/CountryService');
const ApiResponse = require('../../../shared/utils/ApiResponse')

const getCountries = async (req, res, next) => {
    const countries = await CountryService.getAllCountries();
    return ApiResponse.ok(res, countries, 'Países obtenidos exitosamente')
};

module.exports = {
    getCountries
};
