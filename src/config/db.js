// server/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false,

        /**
         * Pool de conexiones — evita agotar el pool por defecto (5 conexiones)
         * al tener concurrencia alta. Ajustar DB_POOL_MAX según el plan del proveedor.
         */
        pool: {
            max:     parseInt(process.env.DB_POOL_MAX)  || 20,  // conexiones activas máximas
            min:     parseInt(process.env.DB_POOL_MIN)  || 5,   // conexiones siempre abiertas
            acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000, // ms esperando una conexión libre
            idle:    parseInt(process.env.DB_POOL_IDLE)    || 10000  // ms antes de liberar conexión inactiva
        },

        // SSL obligatorio en producción (RDS, Supabase, Railway, etc.)
        dialectOptions: {
            ssl: isProduction
                ? { require: true, rejectUnauthorized: false }
                : false
        }
    }
);

module.exports = sequelize;
