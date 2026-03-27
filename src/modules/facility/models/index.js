/**
 * Índice de modelos del módulo Facility
 * 
 * Este archivo centraliza la exportación de todos los modelos
 * del módulo facility y configura las asociaciones entre ellos.
 */

// Importar todos los modelos del módulo facility
const Company = require('./Company');
const Space = require('./Space');
const BusinessHour = require('./BusinessHour');
const Rating = require('./Rating');
const Configuration = require('./Configuration');
const ConfigurationPayment = require('./ConfigurationPayment');
const PaymentAccount = require('./PaymentAccount');

// Crear objeto con todos los modelos del módulo
const models = {
    Company,
    Space,
    BusinessHour,
    Rating,
    Configuration,
    ConfigurationPayment,
    PaymentAccount
};

// Exportar modelos antes de configurar asociaciones para evitar problemas de dependencia circular
module.exports = models;

// Importar modelos de otros módulos para las asociaciones a través de sus índices
const { User, UserFavorite, UserCompany } = require('../../users/models');
const { Media } = require('../../media/models');
const { Country, Ubigeo, SurfaceType, SportType, SportCategory, PaymentType } = require('../../catalogs/models');
const { Booking } = require('../../booking/models');
const { Notification } = require('../../notification/models');

// Objeto con todos los modelos necesarios para las asociaciones
const allModels = {
    ...models,
    User,
    UserFavorite,
    UserCompany,
    Media,
    Country,
    Ubigeo,
    SurfaceType,
    SportType,
    SportCategory,
    PaymentType,
    Booking,
    Notification
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(allModels);
    }
});
