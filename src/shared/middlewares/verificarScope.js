const ApiResponse = require('../utils/ApiResponse');

/**
 * Middleware: verificarScope
 *
 * Garantiza que el usuario autenticado tenga acceso al company_id solicitado.
 * Debe usarse DESPUÉS de verificarTokenAuth.
 *
 * Jerarquía de acceso:
 *   system      → acceso total, sin restricción de empresa
 *   super_admin → accede a cualquier company_id dentro de su tenant (company_ids del JWT)
 *   administrador / empleado → solo al company_id asignado (company_ids del JWT)
 *
 * El company_id se lee de (en orden de prioridad):
 *   1. req.params.companyId
 *   2. req.params.id
 *   3. req.body.sucursal_id  (para rutas POST sin param)
 *   4. req.body.company_id
 *
 * @param {Object} options
 * @param {boolean} options.allowSystem - Si true (por defecto), system siempre pasa. Default: true
 */
const verificarScope = (options = {}) => {
    const { allowSystem = true } = options;

    return (req, res, next) => {
        if (!req.user) {
            return ApiResponse.error(req, res, 'AUTHENTICATION_REQUIRED', 'Autenticación requerida', null, 401);
        }

        // role es string en el JWT post-migración (ya no existe roles[] array)
        const { role = '', company_ids = [], permissions = [] } = req.user;

        // Acceso total: system por rol, o cualquier usuario con system.full_access / company.manage_all
        const hasFullAccess = role === 'system'
            || permissions.includes('system.full_access')
            || permissions.includes('company.manage_all');

        if (allowSystem && hasFullAccess) {
            return next();
        }

        // Resolver el company_id del request
        const rawId =
            req.params.companyId ||
            req.params.id ||
            req.body?.sucursal_id ||
            req.body?.company_id;

        const requestedId = parseInt(rawId, 10);

        if (!rawId || isNaN(requestedId)) {
            // Si no hay ID en el request, dejamos pasar (la ruta no necesita scope de empresa)
            return next();
        }

        // Verificar que el company_id está en la lista de accesos del JWT
        if (!company_ids.includes(requestedId)) {
            return ApiResponse.error(
                req, res,
                'SCOPE_DENIED',
                'No tienes acceso a esta empresa o sucursal.',
                { requested: requestedId, allowed: company_ids },
                403
            );
        }

        next();
    };
};

/**
 * Variante directa sin opciones (caso más común).
 * Equivale a verificarScope() con allowSystem: true.
 */
const verificarScopeDefault = verificarScope();

module.exports = { verificarScope, verificarScopeDefault };
