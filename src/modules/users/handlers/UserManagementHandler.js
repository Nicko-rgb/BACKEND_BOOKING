const UserManagementService = require('../services/UserManagementService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

// ── Permisos ──────────────────────────────────────────────────────────────────

const getPermissions = async (res) => {
    const data = await UserManagementService.getAllPermissions();
    return ApiResponse.ok(res, data, 'Catálogo de permisos');
};

/** Devuelve los usuarios que tienen asignado un permiso específico. */
const getUsersByPermission = async (res, permissionKey) => {
    const data = await UserManagementService.getUsersByPermission(permissionKey);
    return ApiResponse.ok(res, data, `Usuarios con permiso '${permissionKey}'`);
};

/** Crea un nuevo permiso en el catálogo. */
const createPermission = async (res, data) => {
    const perm = await UserManagementService.createPermission(data);
    return ApiResponse.created(res, perm, 'Permiso creado exitosamente');
};

/** Actualiza label, description o app_access de un permiso. */
const updatePermission = async (res, key, data) => {
    const perm = await UserManagementService.updatePermission(key, data);
    return ApiResponse.ok(res, perm, 'Permiso actualizado');
};

// ── Usuarios ──────────────────────────────────────────────────────────────────

const getUsers = async (res, filters, requestingUser) => {
    const { users, total, page, limit, totalPages, stats } = await UserManagementService.getUsers(filters, requestingUser);
    // data = arreglo plano; paginación y stats van en extra ───────────────────
    return ApiResponse.ok(res, users, 'Lista de usuarios', 200, { total, page, limit, totalPages, stats });
};

const getUserDetail = async (res, userId) => {
    const user = await UserManagementService.getUserDetail(userId);
    return ApiResponse.ok(res, user, 'Detalle del usuario');
};

// ── Permisos directos de usuario ──────────────────────────────────────────────

const setUserDirectPermissions = async (res, userId, permissionKeys, requestingUser) => {
    const user = await UserManagementService.setUserDirectPermissions(userId, permissionKeys, requestingUser);
    return ApiResponse.ok(res, user, 'Permisos del usuario actualizados');
};

// ── Menú dinámico ─────────────────────────────────────────────────────────────

const getMenu = async (res, userPermissions) => {
    const { items, grouped } = await UserManagementService.getMenuForUser(userPermissions);
    // data = arreglo plano; grouped va en extra ───────────────────────────────
    return ApiResponse.ok(res, items, 'Menú del usuario', 200, { grouped });
};

// ── Asignación de propietario ─────────────────────────────────────────────────

/** Asigna un super_admin existente como propietario de una empresa principal. */
const assignOwner = async (res, userId, companyId, requestingUser) => {
    const assignment = await UserManagementService.assignOwnerToCompany(userId, companyId, requestingUser);
    return ApiResponse.created(res, assignment, 'Propietario asignado exitosamente');
};

// ── Toggle estado de usuario ──────────────────────────────────────────────────

/** Activa o desactiva un usuario (toggle is_enabled). */
const toggleUserStatus = async (res, userId, requestingUser) => {
    const result = await UserManagementService.toggleUserStatus(userId, requestingUser);
    return ApiResponse.ok(res, result, result.message);
};

module.exports = {
    getPermissions,
    getUsersByPermission,
    createPermission,
    updatePermission,
    getUsers,
    getUserDetail,
    setUserDirectPermissions,
    getMenu,
    assignOwner,
    toggleUserStatus,
};
