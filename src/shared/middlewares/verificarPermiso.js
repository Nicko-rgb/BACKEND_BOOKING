/**
 * Middleware verificarPermiso
 *
 * Valida que el usuario autenticado tenga TODOS los permisos indicados.
 * - system.full_access en el token bypasea cualquier chequeo.
 * - Coexiste con proteger(roles) — ambos pueden usarse en la misma ruta.
 *
 * Uso:
 *   router.put('/confirm', verificarTokenAuth, verificarPermiso('booking.confirm'), handler);
 *   router.get('/stats',   verificarTokenAuth, verificarPermiso('statistics.view'), handler);
 */
const ApiResponse = require('../utils/ApiResponse');

const verificarPermiso = (...requiredPerms) => (req, res, next) => {
    if (!req.user) {
        return ApiResponse.error(req, res, 'AUTHENTICATION_REQUIRED', 'Token de autenticación requerido', null, 401);
    }

    const userPerms = req.user.permissions || [];

    // system.full_access bypasea cualquier chequeo de permiso
    if (userPerms.includes('system.full_access')) return next();

    const missing = requiredPerms.filter(p => !userPerms.includes(p));
    if (missing.length > 0) {
        return ApiResponse.error(
            req, res,
            'INSUFFICIENT_PERMISSIONS',
            'No tienes los permisos necesarios para esta acción',
            { required: requiredPerms, missing },
            403
        );
    }

    next();
};

module.exports = { verificarPermiso };
