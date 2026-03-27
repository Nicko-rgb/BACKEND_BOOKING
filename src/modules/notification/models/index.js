const Notification = require('./Notification');

// Crear objeto con todos los modelos del módulo
const models = {
    Notification
};

// Exportar modelos antes de configurar asociaciones
module.exports = models;

// Importar modelos de otros módulos para las asociaciones
const { User } = require('../../users/models');
const { Company } = require('../../facility/models');

// Objeto con todos los modelos necesarios para las asociaciones
const allModels = {
    ...models,
    User,
    Company
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(allModels);
    }
});
