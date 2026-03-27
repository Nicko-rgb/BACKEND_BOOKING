/**
 * Módulo Booking - Índice de modelos
 * 
 * Este módulo gestiona las reservas del sistema.
 * Contiene los modelos principales relacionados con el proceso de reserva.
 */

// Importar modelos del módulo booking
const Booking = require('./Booking');
const PaymentBooking = require('./PaymentBooking');
const BookingHold = require('./BookingHold');

// Crear objeto con todos los modelos del módulo
const models = {
    Booking,
    PaymentBooking,
    BookingHold
};

// Exportar modelos antes de configurar asociaciones para evitar problemas de dependencia circular
module.exports = models;

// Importar modelos de otros módulos necesarios para las asociaciones a través de sus índices
const { User } = require('../../users/models');
const { Company, Space, Rating } = require('../../facility/models');
const { PaymentType } = require('../../catalogs/models');

// Objeto con todos los modelos para las asociaciones
const allModels = {
    ...models,
    User,
    Company,
    Space,
    Rating,
    PaymentType
};

// Configurar asociaciones
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(allModels);
    }
});
