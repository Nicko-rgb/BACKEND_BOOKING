/**
 * Configuración del logger centralizado (Winston)
 * Formato simple en desarrollo, JSON estructurado en producción.
 */
const winston = require('winston');

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const isDev = process.env.NODE_ENV !== 'production';

// Formato legible para desarrollo ─────────────────────────────────────────────
const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack, ...meta }) => {
        // Incluir metadata extra si existe (ej: requestId, path, method)
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
    })
);

// Formato JSON para producción (compatible con servicios de log externos) ──────
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    format: isDev ? devFormat : prodFormat,
    transports: [
        new winston.transports.Console()
    ]
});

module.exports = logger;
