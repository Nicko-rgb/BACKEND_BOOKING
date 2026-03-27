const RoleService = require('../services/RoleService');
const ApiResponse = require('../../../shared/utils/ApiResponse')

const getRoles = async (req, res, next) => {
    const roles = await RoleService.getAllRoles();
    return ApiResponse.ok(res, roles, 'Roles obtenidos exitosamente')
};

module.exports = {
    getRoles
};
