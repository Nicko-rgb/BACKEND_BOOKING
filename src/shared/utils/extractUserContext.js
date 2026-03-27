/**
 * extractUserContext — extrae del JWT decodificado (req.user) el contexto
 * necesario para filtrar datos según el rol del usuario.
 *
 * Forma del objeto resultante:
 * {
 *   user_id    : number,
 *   roles      : string[],    // ['system'] | ['super_admin'] | ['administrador'] | ['empleado']
 *   company_ids: number[],    // IDs de empresas/sucursales accesibles ([] para system = sin restricción)
 *   tenant_id  : string|null  // tenant del usuario (null para system)
 *   isSystem   : boolean      // shortcut: roles.includes('system')
 * }
 */
const extractUserContext = (req) => {
    const user = req.user || {};

    const roles = Array.isArray(user.roles)
        ? user.roles
        : (user.role ? [user.role] : []);

    const company_ids = Array.isArray(user.company_ids)
        ? user.company_ids.map(Number)
        : [];

    return {
        user_id: user.user_id || null,
        roles,
        company_ids,
        tenant_id: user.tenant_id || null,
        isSystem: roles.includes('system')
    };
};

module.exports = { extractUserContext };
