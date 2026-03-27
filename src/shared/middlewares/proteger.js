/**
 * Helper proteger — combina los 3 middlewares de seguridad en un array limpio.
 *
 * Uso en rutas:
 *   router.get('/details/:id', ...proteger(['system','super_admin'], true), handler);
 *
 * @param {string[]} roles      - Roles permitidos para el endpoint
 * @param {boolean}  conScope   - Si true, aplica verificarScope (req.params.id/companyId)
 */
const { verificarTokenAuth } = require('./verificarTokenAuth');
const { verificarRol } = require('./verificarRol');
const { verificarScopeDefault } = require('./verificarScope');
const { verificarPermiso } = require('./verificarPermiso');

/**
 * proteger(roles, conScope) — valida por ROL (legacy, sigue funcionando)
 *   router.get('/ruta', ...proteger(['system','super_admin'], true), handler);
 */
const proteger = (roles = [], conScope = false) => [
    verificarTokenAuth,
    verificarRol({ roles }),
    ...(conScope ? [verificarScopeDefault] : [])
];

/**
 * protegerPermiso(...perms) — valida por PERMISO (nuevo sistema)
 *   router.get('/ruta', ...protegerPermiso('booking.confirm'), handler);
 */
const protegerPermiso = (...perms) => [
    verificarTokenAuth,
    verificarPermiso(...perms),
];

/**
 * protegerPermisoConScope(...perms) — valida por PERMISO + verifica scope del recurso
 *   router.get('/ruta/:id', ...protegerPermisoConScope('facility.manage_own'), handler);
 */
const protegerPermisoConScope = (...perms) => [
    verificarTokenAuth,
    verificarPermiso(...perms),
    verificarScopeDefault,
];

module.exports = { proteger, protegerPermiso, protegerPermisoConScope };
