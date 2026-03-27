const ApiResponse = require('../utils/ApiResponse');

/**
 * Middleware para verificar roles y permisos del usuario.
 * 
 * @param {Object|Array} options - Opciones de verificación. 
 * Puede ser un array de roles permitidos ['admin', 'system']
 * o un objeto { roles: ['admin'], permissions: ['user.create'] }
 */
const verificarRol = (options = {}) => {
    // Normalizar roles y permisos
    const requiredRoles = Array.isArray(options) ? options : (Array.isArray(options.roles) ? options.roles : []);
    const requiredPermissions = Array.isArray(options.permissions) ? options.permissions : [];

    return (req, res, next) => {
        // 1. Verificar si el usuario está autenticado (req.user debe existir por verificarTokenAuth)
        if (!req.user) {
            return ApiResponse.error(req, res, 'AUTHENTICATION_REQUIRED', 'Autenticación requerida para acceder a este recurso', null, 401);
        }

        // 2. Extraer roles y permisos del usuario (pueden venir del JWT)
        // Soportamos 'role' (string) o 'roles' (array) para máxima flexibilidad
        const userRoles = Array.isArray(req.user.roles) 
            ? req.user.roles 
            : (req.user.role ? [req.user.role] : []);
        
        const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];

        // 3. Verificar Roles (OR: el usuario debe tener al menos uno de los roles requeridos)
        if (requiredRoles.length > 0) {
            const hasRole = requiredRoles.some(role => userRoles.includes(role));
            
            if (!hasRole) {
                const details = { 
                    required: requiredRoles, 
                    current: userRoles,
                    message: 'No tienes ninguno de los roles necesarios'
                };
                return ApiResponse.error(req, res, 'INSUFFICIENT_ROLE', 'Acceso denegado: Rol insuficiente', details, 403);
            }
        }

        // 4. Verificar Permisos (AND: el usuario debe tener TODOS los permisos requeridos)
        if (requiredPermissions.length > 0) {
            const missingPermissions = requiredPermissions.filter(p => !userPermissions.includes(p));
            
            if (missingPermissions.length > 0) {
                const details = { 
                    required: requiredPermissions, 
                    current: userPermissions, 
                    missing: missingPermissions 
                };
                return ApiResponse.error(req, res, 'INSUFFICIENT_PERMISSIONS', 'Acceso denegado: Permisos insuficientes', details, 403);
            }
        }

        // Si pasó todas las verificaciones
        next();
    };
};

module.exports = { verificarRol };
