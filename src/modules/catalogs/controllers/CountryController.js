const CountryHandler = require('../handlers/CountryHandler');

const getCountries = async (req, res, next) => {
    await CountryHandler.getCountries(req, res, next);
};

module.exports = {
    getCountries
};
