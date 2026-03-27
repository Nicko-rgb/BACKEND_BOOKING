class CountryDto {
    /**
     * Convierte un país a formato de opción para select
     * @param {Object} country - Objeto país
     * @returns {Object} Opción formateada {value, label}
     */
    static toSelectOption(country) {
        return {
            country_id: country.country_id,
            country: country.country,
            phone_code: country.phone_code,
            iso_country: country.iso_country,
            flag_url: country.flag_url,
            iso_currency: country.iso_currency,
            currency_simbol: country.currency_simbol
        };
    }

    /**
     * Convierte una lista de países a formato de opciones para select
     * @param {Array} countries - Lista de países
     * @returns {Array} Lista de opciones formateadas
     */
    static toSelectOptionList(countries) {
        return countries.map(country => this.toSelectOption(country));
    }
}

module.exports = CountryDto;