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
const verificarPermiso = (...requiredPerms) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: { code: 'AUTHENTICATION_REQUIRED', message: 'Token de autenticación requerido' },
        });
    }

    const userPerms = req.user.permissions || [];

    // system.full_access bypasea cualquier chequeo de permiso
    if (userPerms.includes('system.full_access')) return next();

    const missing = requiredPerms.filter(p => !userPerms.includes(p));
    if (missing.length > 0) {
        return res.status(403).json({
            success: false,
            error: {
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'No tienes los permisos necesarios para esta acción',
                details: { required: requiredPerms, missing },
            },
        });
    }

    next();
};

module.exports = { verificarPermiso };
