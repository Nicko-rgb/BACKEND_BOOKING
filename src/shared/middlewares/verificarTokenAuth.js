/**
 * Middleware de autenticación JWT.
 * Verifica el token Bearer y, si el token tiene `jti`, consulta la blacklist
 * de Redis para detectar tokens revocados (sesiones cerradas).
 */
const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/ApiResponse');
const redisClient = require('../../config/redisConfig');

// Ahora es async para poder consultar la blacklist de Redis
const verificarTokenAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ApiResponse.error(req, res, 'AUTHENTICATION_REQUIRED', 'No autorizado. Token no proporcionado.', null, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar blacklist solo si el token tiene jti (tokens nuevos con logout)
        if (decoded.jti) {
            const isBlacklisted = await redisClient.get(`blacklist:${decoded.jti}`);
            if (isBlacklisted) {
                return ApiResponse.error(req, res, 'TOKEN_REVOKED', 'Sesión cerrada. Vuelve a iniciar sesión.', null, 401);
            }
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.error(req, res, 'TOKEN_EXPIRED', 'Token expirado. Vuelve a iniciar sesión.', null, 401);
        }
        return ApiResponse.error(req, res, 'INVALID_TOKEN', 'Token inválido o expirado. Vuelve a iniciar sesión.', null, 401);
    }
};

module.exports = { verificarTokenAuth };
