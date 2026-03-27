const UserManagementHandler = require('../handlers/UserManagementHandler');

// GET /api/users/permissions
const getPermissions = async (req, res) => {
    await UserManagementHandler.getPermissions(res);
};

// GET /api/users/roles
const getRoles = async (req, res) => {
    await UserManagementHandler.getRoles(res);
};

// PUT /api/users/roles/:roleId/permissions
const updateRolePermissions = async (req, res) => {
    const { roleId } = req.params;
    const { permission_keys } = req.validatedData;
    await UserManagementHandler.updateRolePermissions(res, Number(roleId), permission_keys, req.user);
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

module.exports = {
    getPermissions,
    getRoles,
    updateRolePermissions,
    getUsers,
    getUserDetail,
    setUserDirectPermissions,
    getMenu,
};
