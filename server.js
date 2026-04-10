/**
 * Servidor principal del sistema de reservas deportivas
 */

// Sentry debe inicializarse antes que todo lo demás para capturar errores desde el arranque
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        // Captura el 100% de transacciones en desarrollo, ajustar en producción
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const chalk = require('chalk');
const path = require('path');
const sequelize = require('./src/config/db');
const logger = require('./src/config/logger');
const { runAllSeeds } = require('./src/seeds/indexSeed');
const GlobalErrorHandler = require('./src/shared/handlers/GlobalErrorHandler');
const userRoutes = require('./src/modules/users/routes/UserRoute');
const userManagementRoutes = require('./src/modules/users/routes/userManagementRoutes');
const companyRoutes = require('./src/modules/facility/routes/companyRoutes');
const configRoutes = require('./src/modules/facility/routes/configRoutes');
const paymentFacilityRoutes = require('./src/modules/facility/routes/paymentRoutes');
const spaceRoutes = require('./src/modules/facility/routes/spaceRoutes');
const indexCatalogsRoute = require('./src/modules/catalogs/routes/indexCatalogsRoute');
const bookingRoutes = require('./src/modules/booking/routes/bookingRoutes');
const paymentBookingRoutes = require('./src/modules/booking/routes/paymentBookingRoutes');
const mediaRoutes = require('./src/modules/media/routes/mediaRoutes');
const inicioRoutes = require('./src/modules/reports/routes/inicioRoutes');
const redisClient = require('./src/config/redisConfig');
const { startExpirationJob } = require('./src/modules/booking/jobs/expirationJob');
const { initSocket } = require('./src/config/socketConfig');
const http = require('http');
const crypto = require('crypto');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

const corsOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000';
const origins = corsOrigins.split(',').map(origin => origin.trim());
const isDev = process.env.NODE_ENV === 'development';

// Seguridad — headers HTTP protectores (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet());

// CORS — múltiples frontends permitidos vía variable de entorno
app.use(cors({
    origin: isDev ? '*' : origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

/**
 * Rate limiting — límite general para toda la API.
 * 200 requests por IP cada 15 minutos.
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes desde esta IP, intenta en 15 minutos.' }
});

/**
 * Rate limiting estricto para endpoints de autenticación.
 * 10 intentos por IP cada 15 minutos — protege contra fuerza bruta.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Auth, Demasiados intentos de autenticación, intenta en 15 minutos.' }
});

app.use('/api/', generalLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

/**
 * Request ID — asigna un ID único a cada request para correlacionar logs.
 * Disponible en req.id y en el header de respuesta X-Request-Id.
 */
app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Log de cada request entrante ────────────────────────────────────────────────
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, { requestId: req.id, ip: req.ip });
    next();
});

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (uploads)
// Cross-Origin-Resource-Policy: cross-origin — permite que frontends en otros puertos
// carguen imágenes directamente (necesario cuando helmet() setea same-origin por defecto)
app.use('/uploads', (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express.static(path.join(__dirname, 'uploads')));

// ============================================
// RUTAS DE LA API
// ============================================

// Ruta de salud del servidor
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
    });
});

// ── Usuarios: auth (registro/login) + gestión completa ───────────────────────
// IMPORTANTE: userRoutes va primero para que sus rutas específicas
// (staff/overview, company/:id, etc.) no sean capturadas por /:userId
app.use('/api/users', userRoutes);
app.use('/api/users', userManagementRoutes);

// ── Empresas y sucursales ─────────────────────────────────────────────────────
app.use('/api/companies', companyRoutes);           // CRUD empresas/sucursales
app.use('/api/companies', configRoutes);            // Configuración branding
app.use('/api/companies', paymentFacilityRoutes);   // Cuentas de pago
app.use('/api/sucursales', companyRoutes);          // Alias de compatibilidad — pendiente eliminar

// ── Espacios deportivos ───────────────────────────────────────────────────────
app.use('/api/spaces', spaceRoutes);

// ── Catálogos (países, roles, deportes, tipos de pago) ───────────────────────
app.use('/api/catalogs', indexCatalogsRoute);

// ── Reservas ──────────────────────────────────────────────────────────────────
// paymentBookingRoutes primero para que /webhooks/stripe capture antes de /:id
app.use('/api/bookings', paymentBookingRoutes);  // Stripe webhook, payment-intent, confirmar pagos
app.use('/api/bookings', bookingRoutes);          // Reservas, holds, historial
app.use('/api/reservations', paymentBookingRoutes); // Alias de compatibilidad — pendiente eliminar
app.use('/api/reservations', bookingRoutes);         // Alias de compatibilidad — pendiente eliminar

// ── Multimedia ────────────────────────────────────────────────────────────────
app.use('/api/media', mediaRoutes);

// ── Reportes / Página de inicio ─────────────────────────────────────────────
app.use('/api/reports', inicioRoutes);


// Manejo de 404 y errores globales
app.use(GlobalErrorHandler.notFound);
// Sentry captura errores antes de que el GlobalErrorHandler responda al cliente
if (process.env.SENTRY_DSN) {
    app.use(Sentry.expressErrorHandler());
}
app.use(GlobalErrorHandler.handleError);

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

/**
 * Función para inicializar la base de datos y poblar datos iniciales
 */
async function inicializarBaseDatos() {
    try {
        const forceSync = process.env.DB_FORCE_SYNC === 'true';
        const alterSync = process.env.DB_ALTER_SYNC === 'true';

        // Guard: DB_FORCE_SYNC=true en producción destruye todas las tablas.
        // Detener el arranque para evitar pérdida catastrófica de datos.
        if (process.env.NODE_ENV === 'production' && forceSync) {
            throw new Error('DB_FORCE_SYNC=true está PROHIBIDO en producción — puede eliminar todas las tablas. Usa migraciones.');
        }

        logger.info('Sincronizando modelos con la base de datos...');
        await sequelize.sync({ force: forceSync, alter: alterSync });
        
        logger.info('Modelos sincronizados correctamente');

        // Poblar datos iniciales si es necesario
        if (process.env.SEED_INITIAL_DATA === 'true' || forceSync) {
            logger.info('Poblando datos iniciales...');
            await runAllSeeds();
        }

        // Iniciar Job de expiración de reservas
        startExpirationJob();

        return true;
    } catch (error) {
        logger.error('Error al inicializar la base de datos', { error: error.message });
        throw error;
    }
}

/**
 * Función principal para iniciar el servidor
 */
async function iniciarServidor() {
    try {
        // Inicializar base de datos
        await inicializarBaseDatos();
        
        // Conectar a Redis
        await redisClient.connect();

        // Inicializar Socket.IO (async para poder conectar el Redis adapter)
        await initSocket(server);
        
        // Configurar puerto y host
        const PORT = process.env.PORT || 3001;
        // En desarrollo, escuchamos en 0.0.0.0 para permitir acceso desde la red local (celulares)
        const HOST = isDev ? '0.0.0.0' : (process.env.HOST || 'localhost');
        
        // Iniciar servidor
        server.listen(PORT, HOST, () => {
            console.log(chalk.bgBlue('\n🎉 SERVIDOR INICIADO EXITOSAMENTE'));
            
            if (HOST === '0.0.0.0') {
                // Obtener la IP local para mostrarla en la consola
                const os = require('os');
                const interfaces = os.networkInterfaces();
                let localIP = 'localhost';
                
                for (const name of Object.keys(interfaces)) {
                    for (const iface of interfaces[name]) {
                        if (iface.family === 'IPv4' && !iface.internal) {
                            localIP = iface.address;
                        }
                    }
                }
                
                console.log(chalk.cyan(`🚀 Servidor corriendo en:`));
                console.log(chalk.cyan(`   - Local:   http://localhost:${PORT}`));
                console.log(chalk.cyan(`   - Red:     http://${localIP}:${PORT}`));
            } else {
                console.log(chalk.cyan(`🚀 Servidor corriendo en: http://${HOST}:${PORT}`));
            }
            
            console.log(chalk.cyan(`🏥 Health check: http://localhost:${PORT}/health`));
            console.log(chalk.yellow(`🌍 Entorno: ${process.env.NODE_ENV }`));
            console.log(chalk.green('✅ ¡Sistema listo para recibir requests!\n'));
        });
        
        /**
         * Graceful shutdown — cierra conexiones en orden correcto:
         * 1. Deja de aceptar nuevas conexiones (server.close)
         * 2. Espera que las queries en vuelo terminen (pool de DB)
         * 3. Cierra el pool de PostgreSQL
         * 4. Cierra la conexión de Redis
         * Garantiza que no se pierdan datos ni queden transacciones abiertas.
         */
        const gracefulShutdown = async (signal) => {
            logger.info(`Señal ${signal} recibida — iniciando graceful shutdown...`);

            server.close(async () => {
                try {
                    await sequelize.close();
                    logger.info('Pool de base de datos cerrado');

                    await redisClient.disconnect();
                    logger.info('Conexión Redis cerrada');

                    logger.info('Servidor cerrado correctamente');
                    process.exit(0);
                } catch (err) {
                    logger.error('Error durante el graceful shutdown', { error: err.message });
                    process.exit(1);
                }
            });

            // Forzar cierre si tarda más de 15 segundos
            setTimeout(() => {
                logger.error('Graceful shutdown superó el tiempo límite — forzando cierre');
                process.exit(1);
            }, 15000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('Error crítico al iniciar el servidor', { error: error.message });
        process.exit(1);
    }
}

// Iniciar el servidor
iniciarServidor();
