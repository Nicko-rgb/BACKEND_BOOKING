// /modules/facility/controllers/CompanyController.js
const CompanyHandler = require('../handlers/CompanyHandler');
const { extractUserContext } = require('../../../shared/utils/extractUserContext');

const registerCompany = async (req, res, next) => {
    const companyData = req.validatedData || req.body;
    const userId = req.user?.user_id;
    const files = req.files || {};
    await CompanyHandler.registerCompany(res, companyData, userId, files);
};

const getAllCompanies = async (req, res, next) => {
    const query = req.validatedQuery || req.query;
    const userContext = extractUserContext(req);
    await CompanyHandler.getAllCompanies(res, query, userContext);
};

// Pasa req.user para que el handler pueda validar el scope del usuario
const getCompanyDetails = async (req, res, next) => {
    const { id } = req.params;
    await CompanyHandler.getCompanyDetails(res, id, req.user);
};

const getSubsidiaryDetails = async (req, res, next) => {
    const { id } = req.params;
    await CompanyHandler.getSubsidiaryDetails(res, id, req.user);
};

const updateCompany = async (req, res, next) => {
    const { id } = req.params;
    const companyData = req.validatedData || req.body;
    const userId = req.user?.user_id;
    const files = req.files || {};
    await CompanyHandler.updateCompany(res, id, companyData, userId, files);
};

const toggleCompanyEnabled = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user?.user_id;
    await CompanyHandler.toggleCompanyEnabled(res, id, userId);
};

// --- Portal BOOKING SPORT ---

const getPublicSucursales = async (req, res, next) => {
    // Extraer filtros validados del query: lat, lng, radius_km, country_id, search
    const filters = req.validatedQuery || {};
    await CompanyHandler.getPublicSucursales(res, filters);
};

const getPublicSucursal = async (req, res, next) => {
    const { id } = req.params;
    // req.user puede ser null (verificarTokenOptional) — se pasa para is_favorited ──
    const userId = req.user?.user_id ?? null;
    await CompanyHandler.getPublicSucursal(res, id, userId);
};

const getPaymentMethods = async (req, res, next) => {
    const { id } = req.params;
    await CompanyHandler.getPaymentMethods(res, id);
};

module.exports = {
    registerCompany,
    getAllCompanies,
    getCompanyDetails,
    getSubsidiaryDetails,
    updateCompany,
    toggleCompanyEnabled,
    getPublicSucursales,
    getPublicSucursal,
    getPaymentMethods
};
