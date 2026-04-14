const CompanyRepository = require('../repository/CompanyRepository');
const MediaService = require('../../media/services/MediaService');
const { BadRequestError, ConflictError, ForbiddenError, NotFoundError } = require('../../../shared/errors/CustomErrors');
const { randomUUID } = require('crypto');
const cacheUtility = require('../../../shared/utils/cacheUtility');

const buildAuditFields = (userId) => {
    if (!userId) {
        throw new BadRequestError('El ID de usuario es obligatorio para el registro de auditoría');
    }
    return { user_create: userId, user_update: userId }
}

const buildBaseCompanyData = (companyData, userId) => {
    return {
        ...companyData,
        ...buildAuditFields(userId),
        status: 'ACTIVE',
        is_enabled: 'A'
    }
}

const validateCountry = async (countryId) => {
    const exists = await CompanyRepository.validateCountryExists(countryId);
    if (!exists) throw new BadRequestError('El país especificado no existe');
}

// Servicio para registrar una empresa (Principal o Sucursal)
const registerCompany = async (companyData, userId, files = {}) => {
    let tenantId;
    let parentCompanyId = companyData.parent_company_id || null;

    if (parentCompanyId) {
        // Es una SUCURSAL
        const parentCompany = await CompanyRepository.findById(parentCompanyId);
        if (!parentCompany) throw new BadRequestError('La compañía padre especificada no existe');
        if (parentCompany.parent_company_id !== null) throw new BadRequestError('La compañía padre debe ser una empresa principal');

        tenantId = parentCompany.tenant_id;
        companyData.country_id = companyData.country_id || parentCompany.country_id;
        // Sucursal hereda el número de documento (RUC/NIT) de su empresa madre ─────────
        companyData.document = parentCompany.document;
    } else {
        // Es una EMPRESA PRINCIPAL
        const existingParentCompany = await CompanyRepository.existsParentByDocument(companyData.document);
        if (existingParentCompany) throw new ConflictError('Ya existe una empresa con este documento');

        tenantId = randomUUID();
    }

    await validateCountry(companyData.country_id);

    const newCompanyData = buildBaseCompanyData({
        ...companyData,
        tenant_id: tenantId,
        parent_company_id: parentCompanyId
    }, userId);

    const newCompany = await CompanyRepository.create(newCompanyData);
    const companyId = newCompany.company_id;

    // Procesar imagen principal si existe → Media (PROFILE)
    if (files.main_image && files.main_image[0]) {
        await MediaService.replacePrimaryMedia(
            files.main_image[0], companyId, 'Company', 'PROFILE', tenantId, userId
        );
    }

    // Invalidar cache
    await cacheUtility.delByPattern('companies:all:*');
    if (parentCompanyId) {
        await cacheUtility.del(cacheUtility.generateKey('company:details', { companyId: parentCompanyId }));
    }

    return newCompany;
};

// Servicio para obtener todas las compañias principales
/**
 * Lista empresas principales con filtros y paginación, respetando el scope del usuario.
 *
 * Estrategia de aislamiento para no-system:
 *   - Filtra por `company_ids` del JWT (lista exacta de empresas asignadas).
 *   - Esto es correcto aunque el usuario tenga empresas en distintos tenants.
 *   - Si no tiene ninguna asignada, devuelve lista vacía.
 *
 * system ve todas sin restricción (con cache).
 */
const getAllCompanies = async (query = {}, userContext = null) => {
    const { page = 1, limit = 10, search, status = 'ACTIVE', is_enabled = 'A', country_id } = query;

    // Sin restricción: system por rol, o usuario con company.manage_all / system.full_access
    const isUnrestricted = !userContext || userContext.isSystem || userContext.isManageAll;

    // Filtro de scope: company_ids del JWT para usuarios restringidos
    // Garantiza que el usuario solo vea sus empresas aunque tengan distintos tenants
    const scopeFilter = !isUnrestricted && userContext.company_ids?.length > 0
        ? { company_ids: userContext.company_ids }
        : {};

    const filters = {
        status,
        is_enabled,
        ...(search && { search }),
        ...(country_id && { country_id }),
        ...scopeFilter,
    };
    const pagination = { page, limit };

    // No cachear para usuarios con scope restringido — sus datos son personales y pueden variar
    if (!isUnrestricted) {
        const result = await CompanyRepository.findParents(filters, pagination);
        return { companies: result.companies, pagination: result.pagination };
    }

    return await cacheUtility.withCache('companies:all', { filters, pagination }, async () => {
        const result = await CompanyRepository.findParents(filters, pagination);
        return { companies: result.companies, pagination: result.pagination };
    });
};

// Servicio para obtener detalles completos (Empresa o Sucursal)
const getCompanyDetails = async (companyId) => {
    if (!companyId) throw new BadRequestError('El ID es requerido');

    return await cacheUtility.withCache('company:details', { companyId }, async () => {
        const company = await CompanyRepository.getCompanyDetails(companyId);
        if (!company) throw new BadRequestError('La compañía o sucursal especificada no existe');
        return company;
    });
};

// Servicio para actualizar (Empresa o Sucursal)
const updateCompany = async (companyId, updateData, userId, files = {}) => {
    const currentCompany = await CompanyRepository.findById(companyId);
    if (!currentCompany) throw new BadRequestError('No existe el registro');

    if (updateData.country_id) await validateCountry(updateData.country_id);

    // Si intenta cambiar de padre
    if (updateData.parent_company_id) {
        const parent = await CompanyRepository.findById(updateData.parent_company_id);
        if (!parent) throw new BadRequestError('El padre especificado no existe');
        updateData.tenant_id = parent.tenant_id;
    }

    const finalUpdateData = {
        ...updateData,
        user_update: userId
    };

    const updatedCompany = await CompanyRepository.update(companyId, finalUpdateData);

    // Procesar imagen principal si existe → reemplaza en Media (PROFILE)
    if (files.main_image && files.main_image[0]) {
        await MediaService.replacePrimaryMedia(
            files.main_image[0], companyId, 'Company', 'PROFILE',
            updatedCompany.tenant_id, userId
        );
    }

    // Invalidar cache
    await cacheUtility.delByPattern('companies:all:*');
    await cacheUtility.del(cacheUtility.generateKey('company:details', { companyId }));
    if (currentCompany.parent_company_id) {
        await cacheUtility.del(cacheUtility.generateKey('company:details', { companyId: currentCompany.parent_company_id }));
    }

    return updatedCompany;
};

// Activar/Desactivar
const toggleCompanyEnabled = async (companyId, userId) => {
    const updated = await CompanyRepository.toggleCompanyEnabled(companyId, userId);
    if (!updated) throw new BadRequestError('No existe el registro');

    await cacheUtility.delByPattern('companies:all:*');
    await cacheUtility.del(cacheUtility.generateKey('company:details', { companyId }));
    if (updated.parent_company_id) {
        await cacheUtility.del(cacheUtility.generateKey('company:details', { companyId: updated.parent_company_id }));
    }

    return updated;
};

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula Haversine.
 * @param {number} lat1 — Latitud origen
 * @param {number} lng1 — Longitud origen
 * @param {number} lat2 — Latitud destino
 * @param {number} lng2 — Longitud destino
 * @returns {number} Distancia en km
 */
const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radio de la Tierra en km ─────────────────────────────────
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Servicio para el Portal de Reservas — lista de sucursales públicas.
 * Resuelve iso_country → country_id y ubigeo_name+level → ubigeo_id antes de
 * delegar al Repository. Cuando hay coordenadas aplica Haversine + filtro
 * de radio en JS y pagina en memoria; sin coordenadas la paginación la hace el DB.
 *
 * @param {object} filters
 *   lat, lng, radius_km  — coordenadas y radio de búsqueda
 *   iso_country          — código ISO del país (ej. "PE") — siempre presente
 *   ubigeo_name          — nombre del ubigeo (ej. "San Isidro")
 *   ubigeo_level         — nivel 1|2|3
 *   search               — texto libre
 *   sport                — nombre de deporte
 *   parking              — boolean
 *   open_now             — boolean
 *   sort_by              — 'distance'|'price_asc'|'price_desc'|'name'
 *   page                 — número de página (1-based)
 *   limit                — items por página
 * @returns {{ items: object[], meta: { total, page, limit, totalPages } }}
 */
const getPublicSucursales = async ({
    lat,
    lng,
    radius_km = 50,
    iso_country,
    ubigeo_name,
    ubigeo_level,
    search,
    sport,
    parking,
    open_now,
    sort_by = 'distance',
    page = 1,
    limit = 12
} = {}) => {
    const userLat = lat != null ? parseFloat(lat) : null;
    const userLng = lng != null ? parseFloat(lng) : null;
    const hasCoords = userLat != null && userLng != null;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10)));

    // 1. Resolver iso_country → country_id ─────────────────────────────────────
    let country_id = null;
    if (iso_country) {
        const country = await CompanyRepository.findCountryByIso(iso_country);
        country_id = country?.country_id ?? null;
    }

    // 2. Resolver ubigeo_name + ubigeo_level → ubigeo_id ──────────────────────
    let ubigeo_id = null;
    if (ubigeo_name && ubigeo_level) {
        const ubigeo = await CompanyRepository.findUbigeoByNameAndLevel(ubigeo_name, ubigeo_level);
        ubigeo_id = ubigeo?.ubigeo_id ?? null;
    }

    // 3. Parámetros comunes del Repository ─────────────────────────────────────
    const repoParams = { country_id, ubigeo_id, search, sport, parking, open_now, sort_by };

    let items;
    let total;

    // Flag para indicar al cliente si se usó fallback a nivel país ──────────────
    let fallbackToCountry = false;

    if (hasCoords) {
        // Con coordenadas: traer todo sin paginación DB para poder filtrar por radio ────
        const { rows } = await CompanyRepository.getActiveSubsidiaries({
            ...repoParams,
            limit: null,
            offset: null
        });

        // Enriquecer con distancia Haversine ───────────────────────────────────
        let enriched = rows.map(s => mapSucursal(s, userLat, userLng));

        // Filtrar por radio ────────────────────────────────────────────────────
        const withinRadius = enriched.filter(
            s => s._distance_km == null || s._distance_km <= parseFloat(radius_km)
        );

        // Fallback: si el radio no devuelve resultados, mostrar todo el país ──
        if (withinRadius.length === 0 && enriched.length > 0) {
            fallbackToCountry = true;
        }

        // Usar resultados del radio o fallback al país completo ───────────────
        enriched = fallbackToCountry ? enriched : withinRadius;

        // Aplicar ordenamiento en memoria según sort_by ───────────────────────
        if (sort_by === 'price_asc') {
            enriched.sort((a, b) => (parseFloat(a.min_price) || 0) - (parseFloat(b.min_price) || 0));
        } else if (sort_by === 'price_desc') {
            enriched.sort((a, b) => (parseFloat(b.min_price) || 0) - (parseFloat(a.min_price) || 0));
        } else if (sort_by === 'name') {
            enriched.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // default: distance — más cercano primero aunque sea fallback ─────
            enriched.sort((a, b) => (a._distance_km ?? Infinity) - (b._distance_km ?? Infinity));
        }

        total = enriched.length;

        // Paginación en JS ─────────────────────────────────────────────────────
        const start = (pageNum - 1) * limitNum;
        items = enriched.slice(start, start + limitNum);
    } else {
        // Sin coordenadas: paginación en DB ────────────────────────────────────
        const offset = (pageNum - 1) * limitNum;
        const { rows, count } = await CompanyRepository.getActiveSubsidiaries({
            ...repoParams,
            limit: limitNum,
            offset
        });

        total = count;
        items = rows.map(s => mapSucursal(s, null, null));
    }

    return {
        items,
        meta: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum)
        },
        fallbackToCountry
    };
};

/**
 * Convierte una instancia Sequelize de Company en el objeto plano para el portal.
 * Extrae deportes únicos, foto principal, features y distancia (si aplica).
 * @param {Company} sucursal   — instancia Sequelize
 * @param {number|null} userLat
 * @param {number|null} userLng
 * @returns {object}
 */
const mapSucursal = (sucursal, userLat, userLng) => {
    const data = sucursal.get({ plain: true });

    // Deportes únicos ofrecidos en la sucursal ─────────────────────────────────
    const sports = [...new Set(data.spaces?.map(s => s.sportType?.name).filter(Boolean))];

    // Foto principal ───────────────────────────────────────────────────────────
    const primaryPhoto = data.media?.find(m => m.is_primary)?.file_url
        ?? data.media?.[0]?.file_url
        ?? null;

    // Características como array ───────────────────────────────────────────────
    const features = data.features
        ? data.features.split(',').map(f => f.trim()).filter(Boolean)
        : [];

    // Distancia Haversine si hay coordenadas del usuario ───────────────────
    const distance_km = userLat != null && userLng != null && data.latitude && data.longitude
        ? haversineKm(userLat, userLng, parseFloat(data.latitude), parseFloat(data.longitude))
        : null;

    return {
        ...data,
        _distance_km: distance_km,
        processed_data: { sports, primary_photo: primaryPhoto, features }
    };
};

// Servicio para obtener los métodos de pago de una sucursal
const getPaymentMethods = async (sucursalId) => {
    const PaymentConfigurationService = require('./PaymentConfigurationService');
    return await PaymentConfigurationService.getActivePaymentsBySucursal(sucursalId);
};

/**
 * Retorna detalles de una empresa o sucursal validando que el usuario tenga acceso.
 * Solo verifica que el registro pertenezca al mismo tenant del usuario.
 * (El frontend garantiza que Company.jsx carga empresas padre y Subsidiary.jsx carga sucursales.)
 * @param {number} companyId
 * @param {object} requestingUser — payload del JWT (permissions, tenant_id)
 */
const getMainCompanyForAdmin = async (companyId, requestingUser) => {
    const company = await CompanyRepository.getCompanyDetails(companyId);
    if (!company) throw new NotFoundError('No tienes acceso a estos datos');

    // Acceso total: system.full_access O company.manage_all ─────────────────
    const canAccessAll = requestingUser?.permissions?.includes('system.full_access')
                      || requestingUser?.permissions?.includes('company.manage_all');
    if (canAccessAll) return company;

    // Verificar por company_ids del JWT — soporta super_admin con empresas
    // en múltiples tenants (el tenant_id del JWT solo refleja el primero)
    const allowedIds = (requestingUser?.company_ids || []).map(Number);
    if (!allowedIds.includes(Number(companyId))) {
        throw new ForbiddenError('No tienes acceso a estos datos');
    }

    return company;
};

/**
 * Retorna detalles de una SUCURSAL validando que el usuario tenga acceso.
 * - Rechaza si el ID corresponde a una empresa principal (parent_company_id == null).
 * - Rechaza si el tenant_id del usuario no coincide (excepto system).
 * @param {number} subsidiaryId
 * @param {object} requestingUser — payload del JWT
 */
const getSubsidiaryForAdmin = async (subsidiaryId, requestingUser) => {
    const company = await CompanyRepository.getCompanyDetails(subsidiaryId);
    if (!company) throw new NotFoundError('Sucursal no encontrada');

    // El ID ingresado corresponde a una empresa principal, no a una sucursal
    if (!company.parent_company_id) {
        throw new ForbiddenError('No tienes acceso a estos datos');
    }

    // Acceso total: system.full_access O company.manage_all ─────────────────
    const canAccessAll = requestingUser?.permissions?.includes('system.full_access')
                      || requestingUser?.permissions?.includes('company.manage_all');
    if (canAccessAll) return company;

    // Verificar por company_ids del JWT — soporta usuarios en múltiples tenants
    const allowedIds = (requestingUser?.company_ids || []).map(Number);
    if (!allowedIds.includes(Number(subsidiaryId))) {
        throw new ForbiddenError('No tienes acceso a estos datos');
    }

    return company;
};

module.exports = {
    registerCompany,
    getAllCompanies,
    getCompanyDetails,
    getMainCompanyForAdmin,
    getSubsidiaryForAdmin,
    updateCompany,
    toggleCompanyEnabled,
    getPublicSucursales,
    getPaymentMethods
};
