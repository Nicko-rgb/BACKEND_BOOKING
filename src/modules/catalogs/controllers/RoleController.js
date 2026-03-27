const RoleHandler = require('../handlers/RoleHandler');

const getRoles = async (req, res, next) => {
    await RoleHandler.getRoles(req, res, next);
};

module.exports = {
    getRoles
};
