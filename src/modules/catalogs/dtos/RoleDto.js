class RoleDto {
    /**
     * Convierte un rol a formato de opción para select
     * @param {Object} role - Objeto rol
     * @returns {Object} Opción formateada {value, label}
     */
    static toSelectOption(role) {
        return {
            value: role.role_id.toString(),
            label: role.role_name
        };
    }

    /**
     * Convierte una lista de roles a formato de opciones para select
     * @param {Array} roles - Lista de roles
     * @returns {Array} Lista de opciones formateadas
     */
    static toSelectOptionList(roles) {
        return roles.map(role => this.toSelectOption(role));
    }
}

module.exports = RoleDto;
