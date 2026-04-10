/**
 * proteger — helpers que combinan middlewares de seguridad en un array limpio.
 *
 * Uso en rutas:
 *   router.get('/ruta', ...protegerPermiso('booking.confirm'), handler);
 *   router.get('/ruta/:id', ...protegerPermisoConScope('facility.manage_own'), handler);
 */
const { verificarTokenAuth } = require('./verificarTokenAuth');
const { verificarScopeDefault } = require('./verificarScope');
const { verificarPermiso } = require('./verificarPermiso');

/**
 * protegerPermiso(...perms) — valida token + permisos directos del usuario.
 * system.full_access en el token bypasea cualquier chequeo de permiso.
 *   router.get('/ruta', ...protegerPermiso('booking.confirm'), handler);
 */
const protegerPermiso = (...perms) => [
    verificarTokenAuth,
    verificarPermiso(...perms),
];

/**
 * protegerPermisoConScope(...perms) — valida token + permisos + scope del recurso.
 * Útil cuando el recurso pertenece a una empresa y hay que verificar que el usuario
 * tiene acceso a esa empresa (company_ids en el JWT).
 *   router.get('/ruta/:id', ...protegerPermisoConScope('facility.manage_own'), handler);
 */
const protegerPermisoConScope = (...perms) => [
    verificarTokenAuth,
    verificarPermiso(...perms),
    verificarScopeDefault,
];

module.exports = { protegerPermiso, protegerPermisoConScope };
