/**
 * Índice de modelos del módulo Media
 * 
 * Este archivo centraliza la exportación de todos los modelos
 * del módulo media y configura las asociaciones entre ellos.
 */

// Importar todos los modelos del módulo media
const Media = require('./Media');

// Crear objeto con todos los modelos del módulo
const models = {
    Media
};

// Exportar modelos antes de configurar asociaciones para evitar problemas de dependencia circular
module.exports = models;

// Importar modelos de otros módulos para las asociaciones a través de sus índices
const { User } = require('../../users/models');
const { Company, Space } = require('../../facility/models');

// Objeto con todos los modelos necesarios para las asociaciones
const allModels = {
    ...models,
    User,
    Company,
    Space
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(allModels);
    }
});
