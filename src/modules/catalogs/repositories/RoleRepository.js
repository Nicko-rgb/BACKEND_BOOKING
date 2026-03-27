const { Role } = require('../models');

class RoleRepository {
    /**
     * Obtiene todos los roles
     * @returns {Promise<Array>} Lista de roles
     */
    static async findAll() {
        try {
            return await Role.findAll({
                attributes: ['role_id', 'role_name'],
                order: [['role_name', 'ASC']]
            });
        } catch (error) {
            throw new Error(`Error al obtener roles: ${error.message}`);
        }
    }
}

module.exports = RoleRepository;
