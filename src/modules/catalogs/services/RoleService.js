const RoleRepository = require('../repositories/RoleRepository');
const RoleDto = require('../dtos/RoleDto');

class RoleService {
    /**
     * Obtiene todos los roles
     * @returns {Promise<Array>} Lista de roles
     */
    static async getAllRoles() {
        try {
            const roles = await RoleRepository.findAll();
            return RoleDto.toSelectOptionList(roles);
        } catch (error) {
            throw new Error(`Error en el servicio de roles: ${error.message}`);
        }
    }
}

module.exports = RoleService;
