/**
 * UserManagementController — Controladores de gestión de usuarios y permisos.
 * getRoles y updateRolePermissions fueron eliminados junto con la tabla dsg_bss_roles.
 */
const UserManagementHandler = require('../handlers/UserManagementHandler');

// GET /api/users/permissions
const getPermissions = async (req, res) => {
    await UserManagementHandler.getPermissions(res);
};

// GET /api/users/permissions/:key/users
const getUsersByPermission = async (req, res) => {
    await UserManagementHandler.getUsersByPermission(res, req.params.key);
};

// POST /api/users/permissions
const createPermission = async (req, res) => {
    await UserManagementHandler.createPermission(res, req.validatedData);
};

// PUT /api/users/permissions/:key
const updatePermission = async (req, res) => {
    await UserManagementHandler.updatePermission(res, req.params.key, req.validatedData);
};

// GET /api/users
const getUsers = async (req, res) => {
    const { page, limit, search, role, company_id } = req.validatedQuery;
    await UserManagementHandler.getUsers(res, {
        page,
        limit,
        search,
        roleFilter: role,
        companyId:  company_id || null,
    }, req.user);
};

// GET /api/users/:userId
const getUserDetail = async (req, res) => {
    const { userId } = req.params;
    await UserManagementHandler.getUserDetail(res, Number(userId));
};

// PUT /api/users/:userId/permissions
const setUserDirectPermissions = async (req, res) => {
    const { userId } = req.params;
    const { permission_keys } = req.validatedData;
    await UserManagementHandler.setUserDirectPermissions(res, Number(userId), permission_keys, req.user);
};

// GET /api/users/menu
const getMenu = async (req, res) => {
    const userPermissions = req.user?.permissions || [];
    await UserManagementHandler.getMenu(res, userPermissions);
};

// POST /api/users/assign-owner
const assignOwner = async (req, res) => {
    const { user_id, company_id } = req.validatedData;
    await UserManagementHandler.assignOwner(res, Number(user_id), Number(company_id), req.user);
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
};
