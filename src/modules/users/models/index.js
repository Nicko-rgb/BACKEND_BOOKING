/**
 * Archivo principal de modelos - Configuración de relaciones
 * 
 * Este archivo centraliza la importación de todos los modelos
 * y establece las relaciones entre ellos usando Sequelize.
 */
const User = require('./User');
const Person = require('./Person');
const UserRole = require('./UserRole');
const UserFavorite = require('./UserFavorite');
const UserCompany = require('./UserCompany');
const UserPermission = require('./UserPermission');

// Crear objeto con todos los modelos del módulo
const models = {
    User,
    Person,
    UserRole,
    UserFavorite,
    UserCompany,
    UserPermission,
};

// Exportar modelos antes de configurar asociaciones para evitar problemas de dependencia circular
module.exports = models;

// Importar modelos de otros módulos para las asociaciones a través de sus índices
const { Media } = require('../../media/models');
const { Booking } = require('../../booking/models');
const { Rating, Company } = require('../../facility/models');
const { Role, Country, RolePermission, Permission } = require('../../catalogs/models');

// Objeto con todos los modelos necesarios para las asociaciones
const allModels = {
    ...models,
    Media,
    Booking,
    Rating,
    Company,
    Role,
    Country,
    UserCompany,
    RolePermission,
    Permission,
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(allModels);
    }
});
