/**
 * Índice de modelos de catálogos
 * Centraliza la exportación de todos los modelos de catálogos generales
 * que son utilizados por múltiples módulos del sistema
 */

const Country = require('./Country');
const Department = require('./Department');
const Province = require('./Province');
const District = require('./District');
const Ubigeo = require('./Ubigeo'); // Modelo geográfico unificado y autorreferenciado
const SportType = require('./SportType');
const SurfaceType = require('./SurfaceType');
const SportCategory = require('./SportCategory');
const PaymentType = require('./PaymentType');
const Permission = require('./Permission');
const MenuItem = require('./MenuItem');

// Crear objeto con todos los modelos del módulo ────────────────────────────
// Role y RolePermission fueron eliminados — el sistema usa permisos directos por usuario
const models = {
    Country,
    Department,
    Province,
    District,
    Ubigeo,
    SportType,
    SurfaceType,
    SportCategory,
    PaymentType,
    Permission,
    MenuItem,
};

// Exportar modelos antes de configurar asociaciones para evitar problemas de dependencia circular
module.exports = models;

// Importar modelos de otros módulos para las asociaciones
// Usamos require aquí para que se carguen después de exportar los modelos actuales
const { Space, Company } = require('../../facility/models');
const { User, UserCompany, UserPermission } = require('../../users/models');
const { PaymentBooking } = require('../../booking/models');

// Objeto con todos los modelos necesarios para las asociaciones
const allModels = {
    ...models,
    Space,
    Company,
    User,
    UserCompany,
    UserPermission,
    PaymentBooking,
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(allModels);
    }
});
