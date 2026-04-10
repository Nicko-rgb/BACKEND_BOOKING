const BookingRepository = require('../repository/BookingRepository');
const { getIO } = require('../../../config/socketConfig');
const redisClient = require('../../../config/redisConfig');
const logger = require('../../../config/logger');

let dynamicTimeout = null;

// Clave y TTL del lock distribuido — el TTL es ligeramente menor que el intervalo (15s)
// para garantizar que expire antes del siguiente ciclo y no quede huérfano.
const LOCK_KEY = 'lock:expiration_job';
const LOCK_TTL_MS = 14000;

/**
 * Emite 'booking:released' para cada hold expirado y los elimina de la BD.
 * Usa un lock distribuido en Redis para que, en entornos con múltiples instancias,
 * solo un servidor ejecute el job por ciclo.
 */
const processExpiredHolds = async () => {
    // Intentar adquirir el lock — si falla (otra instancia lo tiene) salir sin procesar
    const lockAcquired = await redisClient.setNX(LOCK_KEY, LOCK_TTL_MS);
    if (!lockAcquired) return;

    try {
        const expiredHolds = await BookingRepository.findAndDeleteExpiredHolds();

        if (expiredHolds.length > 0) {
            logger.info(`Expiration job: ${expiredHolds.length} hold(s) expirado(s) eliminados`);
            const io = getIO();

            expiredHolds.forEach(hold => {
                // Sala compuesta space:id:date → solo los usuarios de esa fecha reciben el evento
                const bookingDate = hold.booking_date instanceof Date
                    ? hold.booking_date.toISOString().split('T')[0]
                    : String(hold.booking_date).split('T')[0];
                const room = `space:${String(hold.space_id)}:${bookingDate}`;
                io.to(room).emit('booking:released', {
                    booking_date: bookingDate,
                    booking_id: `hold-${hold.hold_id}`
                });
            });
        }
    } catch (error) {
        logger.error('Error en Job de expiración', { error: error.message });
    }
    // El lock expira automáticamente con el TTL — no se necesita liberación explícita
};

/**
 * Programa un timeout dinámico para el próximo hold que va a expirar.
 * Esto garantiza que el slot se libere en tiempo real, sin esperar el intervalo fijo.
 */
const scheduleNextExpiration = async () => {
    try {
        // Obtener el hold activo que expira más pronto
        const nextHold = await BookingRepository.findNextExpiringHold();

        if (dynamicTimeout) {
            clearTimeout(dynamicTimeout);
            dynamicTimeout = null;
        }

        if (nextHold) {
            const msUntilExpiry = new Date(nextHold.expires_at).getTime() - Date.now();
            // Esperar hasta que expire + 500ms de margen
            const delay = Math.max(500, msUntilExpiry + 500);

            dynamicTimeout = setTimeout(async () => {
                await processExpiredHolds();
                // Reprogramar para el próximo hold tras limpiar
                await scheduleNextExpiration();
            }, delay);
        }
    } catch (error) {
        logger.error('Error al programar siguiente expiración', { error: error.message });
    }
};

/**
 * Inicia el sistema de expiración:
 * - Intervalo de seguridad cada 15 segundos (limpia holds que se hayan escapado)
 * - Timer dinámico que dispara exactamente cuando vence el próximo hold
 */
const startExpirationJob = () => {
    logger.info('Iniciando Job de expiración de reservas...');

    // Intervalo de seguridad: captura cualquier hold que haya escapado al timer dinámico
    setInterval(async () => {
        await processExpiredHolds();
        await scheduleNextExpiration(); // Reprogramar tras cada barrido
    }, 15000); // cada 15 segundos (antes era 60s)

    // Arrancar el timer dinámico inmediatamente al iniciar
    scheduleNextExpiration();
};

module.exports = { startExpirationJob, scheduleNextExpiration };