/**
 * Servidor principal del sistema de reservas deportivas
 */
const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const path = require('path');
const sequelize = require('./src/config/db');
const { runAllSeeds } = require('./src/seeds/indexSeed');
const GlobalErrorHandler = require('./src/shared/handlers/GlobalErrorHandler');
const userRoutes           = require('./src/modules/users/routes/UserRoute');
const userManagementRoutes = require('./src/modules/users/routes/userManagementRoutes');
const companyRoutes        = require('./src/modules/facility/routes/companyRoutes');
const configRoutes         = require('./src/modules/facility/routes/configRoutes');
const paymentFacilityRoutes = require('./src/modules/facility/routes/paymentRoutes');
const spaceRoutes          = require('./src/modules/facility/routes/spaceRoutes');
const indexCatalogsRoute   = require('./src/modules/catalogs/routes/indexCatalogsRoute');
const bookingRoutes        = require('./src/modules/booking/routes/bookingRoutes');
const paymentBookingRoutes = require('./src/modules/booking/routes/paymentBookingRoutes');
const mediaRoutes          = require('./src/modules/media/routes/mediaRoutes');
const inicioRoutes      = require('./src/modules/reports/routes/inicioRoutes');
const redisClient = require('./src/config/redisConfig');
const { startExpirationJob } = require('./src/modules/booking/jobs/expirationJob');
const { initSocket } = require('./src/config/socketConfig');
const http = require('http');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Inicializar Socket.IO
initSocket(server);

// Configuración de CORS para permitir requests desde múltiples frontends
const corsOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000';
const origins = corsOrigins.split(',').map(origin => origin.trim());
const isDev = process.env.NODE_ENV === 'development';

app.use(cors({
    origin: isDev ? '*' : origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// ── Dashboard / Página de inicio ─────────────────────────────────────────────
app.use('/api/reports', inicioRoutes);


// Manejo de 404 y errores globales
app.use(GlobalErrorHandler.notFound);
app.use(GlobalErrorHandler.handleError);

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

/**
 * Función para inicializar la base de datos y poblar datos iniciales
 */
async function inicializarBaseDatos() {
    try {
        // Sincronizar modelos con la base de datos
        const forceSync = process.env.DB_FORCE_SYNC === 'true';
        const alterSync = process.env.DB_ALTER_SYNC === 'true';
        
        console.log(chalk.yellow('🔄 Sincronizando modelos con la base de datos...'));
        await sequelize.sync({ force: forceSync, alter: alterSync });
        
        console.log(chalk.bgGreen('✅ Modelos sincronizados correctamente'));
        
        // Poblar datos iniciales si es necesario
        if (process.env.SEED_INITIAL_DATA === 'true' || forceSync) {
            console.log(chalk.yellow('🌱 Poblando datos iniciales...'));
            await runAllSeeds();
        }

        // Iniciar Job de expiración de reservas
        startExpirationJob();
        
        return true;
    } catch (error) {
        console.error(chalk.red('❌ Error al inicializar la base de datos:'), error);
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
            console.log(chalk.yellow(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`));
            console.log(chalk.green('✅ ¡Sistema listo para recibir requests!\n'));
        });
        
        // Manejo graceful de cierre del servidor
        process.on('SIGTERM', () => {
            console.log(chalk.yellow('\n⚠️  Recibida señal SIGTERM, cerrando servidor...'));
            server.close(() => {
                console.log(chalk.green('✅ Servidor cerrado correctamente'));
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            console.log(chalk.yellow('\n⚠️  Recibida señal SIGINT (Ctrl+C), cerrando servidor...'));
            server.close(() => {
                console.log(chalk.green('✅ Servidor cerrado correctamente'));
                process.exit(0);
            });
        });
        
    } catch (error) {
        console.error(chalk.red('🔴 Error crítico al iniciar el servidor:'), error);
        process.exit(1);
    }
}

// Iniciar el servidor
iniciarServidor();
