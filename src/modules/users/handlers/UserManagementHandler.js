const UserManagementService = require('../services/UserManagementService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

// ── Permisos ──────────────────────────────────────────────────────────────────

const getPermissions = async (res) => {
    const data = await UserManagementService.getAllPermissions();
    return ApiResponse.ok(res, data, 'Catálogo de permisos');
};

// ── Roles ─────────────────────────────────────────────────────────────────────

const getRoles = async (res) => {
    const roles = await UserManagementService.getAllRoles();
    return ApiResponse.ok(res, roles, 'Roles del sistema');
};

const updateRolePermissions = async (res, roleId, permissionKeys, requestingUser) => {
    const role = await UserManagementService.updateRolePermissions(roleId, permissionKeys, requestingUser);
    return ApiResponse.ok(res, role, 'Permisos del rol actualizados');
};

// ── Usuarios ──────────────────────────────────────────────────────────────────

const getUsers = async (res, filters, requestingUser) => {
    const data = await UserManagementService.getUsers(filters, requestingUser);
    return ApiResponse.ok(res, data, 'Lista de usuarios');
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
    const data = await UserManagementService.getMenuForUser(userPermissions);
    return ApiResponse.ok(res, data, 'Menú del usuario');
};

module.exports = {
    getPermissions,
    getRoles,
    updateRolePermissions,
    getUsers,
    getUserDetail,
    setUserDirectPermissions,
    getMenu,
};
