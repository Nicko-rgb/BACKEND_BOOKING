/**
 * extractUserContext — extrae del JWT decodificado (req.user) el contexto
 * necesario para filtrar datos según el tipo de usuario.
 *
 * Con la migración a permisos directos el token ya no incluye `roles[]`.
 * Solo incluye `role` (string varchar).
 * `roles` se mantiene como array de un elemento para compatibilidad con código existente.
 *
 * Forma del objeto resultante:
 * {
 *   user_id    : number,
 *   role       : string,      // 'system' | 'super_admin' | 'administrador' | 'empleado' | 'cliente'
 *   roles      : string[],    // [role] — mantenido para compatibilidad
 *   company_ids: number[],    // IDs de empresas/sucursales accesibles ([] para system = sin restricción)
 *   tenant_id  : string|null  // tenant del usuario (null para system)
 *   isSystem   : boolean      // shortcut: role === 'system'
 * }
 */
const extractUserContext = (req) => {
    const user = req.user || {};

    // role es string en el nuevo token — construir roles[] para compatibilidad ─
    const role  = user.role || '';
    const roles = role ? [role] : [];

    const company_ids = Array.isArray(user.company_ids)
        ? user.company_ids.map(Number)
        : [];

    const permissions = Array.isArray(user.permissions) ? user.permissions : [];

    return {
        user_id:      user.user_id || null,
        role,
        roles,
        company_ids,
        tenant_id:    user.tenant_id || null,
        permissions,
        // Shortcuts de acceso total — true si tiene system.full_access O company.manage_all ─
        isSystem:     role === 'system',
        isManageAll:  permissions.includes('system.full_access')
                   || permissions.includes('company.manage_all'),
    };
};

module.exports = { extractUserContext };
