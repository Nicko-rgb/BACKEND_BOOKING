/**
 * Middleware de autenticación JWT opcional.
 * Si el token es válido: decodifica y asigna req.user.
 * Si no hay token o es inválido: asigna req.user = null y continúa sin error.
 * Útil en endpoints públicos que muestran datos extra cuando el usuario está autenticado.
 */
const jwt = require('jsonwebtoken');
const redisClient = require('../../config/redisConfig');

const verificarTokenOptional = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // Sin token — continuar como usuario anónimo ──────────────────────────────
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar blacklist solo si el token tiene jti ──────────────────────
        if (decoded.jti) {
            const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
            if (isBlacklisted) {
                req.user = null;
                return next();
            }
        }

        req.user = decoded;
        next();
    } catch {
        // Token inválido o expirado — tratar como anónimo ─────────────────────
        req.user = null;
        next();
    }
};

module.exports = { verificarTokenOptional };
