
/**
 * Extrae datos del request y pasa los datos puros
 */
const { ForbiddenError } = require('../../../shared/errors/CustomErrors');
const userHandler = require('../handlers/UserHandler');

const createUser = async (req, res) => {
    const { name, lastName, email, password, phone, code, isInvited, document_number, document_type, countryId } = req.validatedData;
    await userHandler.createUserHandler(res, { name, lastName, email, password, phone, code, isInvited, document_number, document_type, countryId });
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    await userHandler.loginUserHandler(res, { email, password });
};

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    await userHandler.loginAdminHandler(res, { email, password });
};

const socialLogin = async (req, res) => {
    const { provider, socialId, email, name, lastName, avatar, countryId } = req.body;
    await userHandler.socialLoginHandler(res, { provider, socialId, email, name, lastName, avatar, countryId });
};

const getAllUsers = async (req, res) => {
    const filters = req.validatedQuery || req.query;
    await userHandler.getAllUsersHandler(res, filters);
};

const registerAdminUser = async (req, res) => {
    const userData = req.validatedData || req.body;
    await userHandler.registerAdminUserHandler(res, userData, req);
};

const getUsersByCompany = async (req, res) => {
    const { companyId } = req.params;
    await userHandler.getUsersByCompanyHandler(res, companyId);
};

const getTenantStaff = async (req, res) => {
    const { companyId } = req.params;
    await userHandler.getTenantStaffHandler(res, companyId);
};

const getStaffOverview = async (req, res) => {
    const filters = req.validatedQuery || req.query;
    await userHandler.getStaffOverviewHandler(res, filters);
};

const updateStaffUser = async (req, res) => {
    const { userId } = req.params;
    const data = req.validatedData || req.body;
    await userHandler.updateStaffUserHandler(res, userId, data);
};

// Extrae el token del header y lo pasa al handler para su revocación
const logout = async (req, res) => {
    const token = req.headers.authorization.split(' ')[1];
    await userHandler.logoutHandler(res, token);
};

module.exports = {
    createUser,
    loginUser,
    loginAdmin,
    socialLogin,
    getAllUsers,
    registerAdminUser,
    getUsersByCompany,
    getTenantStaff,
    getStaffOverview,
    updateStaffUser,
    logout
};
