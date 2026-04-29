const CompanyService = require('../services/CompanyService');
const FavoriteService = require('../services/FavoriteService');
const { CompanyDto } = require('../dto/CompanyDto');
const ApiResponse = require('../../../shared/utils/ApiResponse');

// Registra una nueva empresa o sucursal
const registerCompany = async (res, companyData, userId, files) => {
    const company = await CompanyService.registerCompany(companyData, userId, files);
    const response = CompanyDto.toResponse(company);
    return ApiResponse.created(res, response, company.parent_company_id ? 'Sucursal registrada exitosamente.' : 'Compañía registrada exitosamente.');
};

// Obtiene empresas filtradas automáticamente según el rol del usuario
const getAllCompanies = async (res, query, userContext) => {
    const result = await CompanyService.getAllCompanies(query, userContext);
    const response = result.companies.map(company => CompanyDto.toResponse(company));
    return ApiResponse.ok(res, response, 'Listado de compañías', 200, { pagination: result.pagination });
};

/**
 * Obtiene detalles de una EMPRESA PRINCIPAL.
 * - Rechaza si el ID es de una sucursal.
 * - Rechaza si el usuario no pertenece al mismo tenant (excepto system).
 */
const getCompanyDetails = async (res, id, requestingUser) => {
    const company = await CompanyService.getMainCompanyForAdmin(id, requestingUser);
    const response = CompanyDto.toResponse(company);
    return ApiResponse.ok(res, response, 'Detalles de compañía: ' + company.name);
};

/**
 * Obtiene detalles de una SUCURSAL.
 * - Rechaza si el ID es de una empresa principal.
 * - Rechaza si el usuario no pertenece al mismo tenant (excepto system).
 */
const getSubsidiaryDetails = async (res, id, requestingUser) => {
    const company = await CompanyService.getSubsidiaryForAdmin(id, requestingUser);
    const response = CompanyDto.toResponse(company);
    return ApiResponse.ok(res, response, 'Detalles de sucursal: ' + company.name);
};

// Actualiza (Empresa o Sucursal)
const updateCompany = async (res, id, companyData, userId, files) => {
    const company = await CompanyService.updateCompany(id, companyData, userId, files);
    const response = CompanyDto.toResponse(company);
    return ApiResponse.ok(res, response, company.parent_company_id ? 'Sucursal actualizada.' : 'Compañía actualizada.');
};

// Activar/Desactivar
const toggleCompanyEnabled = async (res, id, userId) => {
    const company = await CompanyService.toggleCompanyEnabled(id, userId);
    const response = CompanyDto.toResponse(company);
    return ApiResponse.ok(res, response, company.is_enabled === 'A' ? 'Activado' : 'Inactivado');
};

// --- Handlers específicos para el Portal de Reservas (BOOKING SPORT) ---

/**
 * Lista de sucursales públicas con filtros de ubicación, deportes y paginación.
 * @param {object} filters — validados por publicSucursalQueryDto
 */
const getPublicSucursales = async (res, filters = {}) => {
    const { items, meta, fallbackToCountry } = await CompanyService.getPublicSucursales(filters);
    // Formatear items con el DTO de respuesta de lista ─────────────────────────
    const response = CompanyDto.toResponseBSList(items);
    return ApiResponse.ok(
        res,
        { items: response, meta, fallback_to_country: fallbackToCountry },
        'Lista de sucursales obtenida exitosamente.'
    );
};

/**
 * Datos de una sucursal para reserva (Portal BOOKING SPORT).
 * Enriquece la respuesta con favorites_count e is_favorited.
 * @param {number|null} userId — null si el usuario no está autenticado
 */
const getPublicSucursal = async (res, id, userId = null) => {
    const sucursal = await CompanyService.getCompanyDetails(id);
    if (sucursal.is_enabled !== 'A') {
        return ApiResponse.error(null, res, 'NOT_FOUND', 'Sucursal inactiva o no encontrada.', null, 404);
    }
    // Agregar datos de favoritos (count siempre, is_favorited solo si hay sesión) ──
    const favoriteData = await FavoriteService.getFavoriteStatus(userId, id);
    const response = {
        ...CompanyDto.toResponseBSData(sucursal),
        ...favoriteData
    };
    return ApiResponse.ok(res, response, 'Información de la sucursal para reserva.');
};

// Obtener métodos de pago de una sucursal
const getPaymentMethods = async (res, id) => {
    const paymentMethods = await CompanyService.getPaymentMethods(id);
    return ApiResponse.ok(res, paymentMethods, 'Métodos de pago de la sucursal.');
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
