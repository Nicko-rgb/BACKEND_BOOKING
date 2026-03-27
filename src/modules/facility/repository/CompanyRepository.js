/**
 * Repository para Company - Capa de acceso a datos
 * 
 * Maneja todas las operaciones de base de datos relacionadas con las compañías.
 * Implementa el patrón Repository para abstraer la lógica de acceso a datos.
 */
const { Op } = require('sequelize');
const Company = require('../models/Company');
const Configuration = require('../models/Configuration');
const Space = require('../models/Space');
const ConfigurationPayment = require('../models/ConfigurationPayment');
const { Country, SurfaceType, SportType, SportCategory, Role, Ubigeo } = require('../../catalogs/models');
const { Media } = require('../../media/models');
const { UserCompany, User, Person } = require('../../users/models');

// Crear nueva compañía (o sucursal si lleva parent_company_id)
const create = async (companyData, transaction = null) => {
    const options = transaction ? { transaction } : {};
    const company = await Company.create(companyData, options);
    return await getCompanyDetails(company.company_id, transaction);
};

// Buscar compañía por ID
const findById = async (id, transaction = null) => {
    const options = {
        where: { company_id: id },
        include: [
            {
                model: Country,
                as: 'country',
                // Incluir campos de moneda para soporte internacional ─────────
                attributes: ['country_id', 'country', 'iso_country', 'iso_currency', 'currency_simbol']
            },
            // Jerarquía geográfica completa: district → province → department ───────
            {
                model: Ubigeo,
                as: 'ubigeo',
                required: false,
                attributes: ['ubigeo_id', 'code', 'name', 'level'],
                include: [
                    {
                        model: Ubigeo,
                        as: 'parent',
                        required: false,
                        attributes: ['ubigeo_id', 'code', 'name', 'level'],
                        include: [
                            {
                                model: Ubigeo,
                                as: 'parent',
                                required: false,
                                attributes: ['ubigeo_id', 'code', 'name', 'level']
                            }
                        ]
                    }
                ]
            },
            {
                model: Company,
                as: 'parentCompany',
                attributes: ['company_id', 'name'],
                required: false,
                include: [
                    {
                        model: Company,
                        as: 'subsidiaries',
                        attributes: ['company_id', 'name', 'document', 'address', 'phone', 'phone_cell', 'status', 'is_enabled', 'created_at', 'opening_time', 'closing_time'],
                        include: [
                            {
                                model: Country,
                                as: 'country',
                                attributes: ['country_id', 'country', 'flag_url']
                            },
                            {
                                model: Space,
                                as: 'spaces',
                                attributes: ['space_id', 'name', 'status_space', 'capacity'],
                                required: false
                            }
                        ]
                    }
                ]
            },
            {
                model: Configuration,
                as: 'configuration',
                required: false
            },
            {
                model: Media,
                as: 'media',
                required: false,
                where: {
                    medible_type: 'Company'
                }
            }
        ]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Company.findOne(options);
};

// Buscar compañía por documento
const findByDocument = async (document, tenantId = null, transaction = null) => {
    const whereConditions = { document };

    if (tenantId) {
        whereConditions.tenant_id = tenantId;
    }

    const options = {
        where: whereConditions
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Company.findOne(options);
};

// Validar que existe un país por ID
const validateCountryExists = async (countryId, transaction = null) => {
    const options = {
        where: { country_id: countryId }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    const country = await Country.findOne(options);
    return country !== null;
};

// Validar que existe una compañía padre por ID
const validateParentCompanyExists = async (parentCompanyId, transaction = null) => {
    const options = {
        where: { company_id: parentCompanyId }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    const parentCompany = await Company.findOne(options);
    return parentCompany !== null;
};

// Buscar compañías con paginación y filtros
const findAll = async (filters = {}, pagination = {}, transaction = null) => {
    const { page = 1, limit = 10 } = pagination;
    const offset = (page - 1) * limit;

    // Construir condiciones WHERE
    const whereConditions = {};

    if (filters.tenant_id) {
        whereConditions.tenant_id = filters.tenant_id;
    }

    if (filters.status) {
        whereConditions.status = filters.status;
    }

    if (filters.country_id) {
        whereConditions.country_id = filters.country_id;
    }

    if (Object.prototype.hasOwnProperty.call(filters, 'parent_company_id')) {
        whereConditions.parent_company_id = filters.parent_company_id;
    }

    if (filters.search) {
        whereConditions[Op.or] = [
            { name: { [Op.iLike]: `%${filters.search}%` } },
            { document: { [Op.iLike]: `%${filters.search}%` } },
            { address: { [Op.iLike]: `%${filters.search}%` } }
        ];
    }

    const options = {
        where: whereConditions,
        include: [
            {
                model: Country,
                as: 'country',
                attributes: ['country_id', 'country', 'flag_url']
            },
            {
                model: Configuration,
                as: 'configuration',
                required: false
            },
            {
                model: Media,
                as: 'media',
                required: false,
                where: {
                    medible_type: 'Company'
                }
            }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    const result = await Company.findAndCountAll(options);

    return {
        companies: result.rows,
        pagination: {
            total: result.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(result.count / limit)
        }
    };
};

// Actualizar compañía
const update = async (id, updateData, transaction = null) => {
    const options = {
        where: { company_id: id }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    const [updatedRowsCount] = await Company.update(updateData, options);

    if (updatedRowsCount === 0) {
        return null;
    }

    return await getCompanyDetails(id, transaction);
};

// Verificar si existe una compañía con el documento dado
const existsByDocument = async (document, tenantId = null, excludeId = null, transaction = null) => {
    const whereConditions = { document };

    if (tenantId) {
        whereConditions.tenant_id = tenantId;
    }

    if (excludeId) {
        whereConditions.company_id = { [Op.ne]: excludeId };
    }

    const options = {
        where: whereConditions
    };

    if (transaction) {
        options.transaction = transaction;
    }

    const count = await Company.count(options);
    return count > 0;
};

const existsParentByDocument = async (document, tenantId = null, excludeId = null, transaction = null) => {
    const whereConditions = { document, parent_company_id: null };

    if (tenantId) {
        whereConditions.tenant_id = tenantId;
    }

    if (excludeId) {
        whereConditions.company_id = { [Op.ne]: excludeId };
    }

    const options = {
        where: whereConditions
    };

    if (transaction) {
        options.transaction = transaction;
    }

    const count = await Company.count(options);
    return count > 0;
};

const findParents = async (filters = {}, pagination = {}, transaction = null) => {
    const parentFilters = { ...filters, parent_company_id: null };
    return await findAll(parentFilters, pagination, transaction);
};

// Buscar compañías por país
const findByCountry = async (countryId, transaction = null) => {
    const options = {
        where: {
            country_id: countryId,
            status: 'ACTIVE',
            is_enabled: 'A'
        },
        include: [
            {
                model: Country,
                as: 'country',
                attributes: ['country_id', 'country', 'iso_country']
            }
        ],
        order: [['name', 'ASC']]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Company.findAll(options);
};

// Buscar compañías cercanas (versión simplificada)
const findNearby = async (latitude, longitude, radiusKm = 10, transaction = null) => {
    const options = {
        where: {
            status: 'ACTIVE',
            is_enabled: 'A',
            latitude: { [Op.ne]: null },
            longitude: { [Op.ne]: null }
        },
        include: [
            {
                model: Country,
                as: 'country',
                attributes: ['country_id', 'country', 'iso_country']
            }
        ],
        order: [['name', 'ASC']]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    // Retornar todas las compañías con coordenadas
    // La lógica de distancia se puede mover a un servicio separado si es necesaria
    return await Company.findAll(options);
};

// Obtener detalles completos de una compañía o sucursal
const getCompanyDetails = async (companyId, transaction = null) => {
    const options = {
        where: { company_id: companyId },
        include: [
            {
                model: Country,
                as: 'country',
                // Incluir moneda para soporte internacional ────────────────────
                attributes: ['country_id', 'country', 'flag_url', 'currency_simbol', 'iso_currency']
            },
            // Jerarquía geográfica completa: district → province → department ───────
            {
                model: Ubigeo,
                as: 'ubigeo',
                required: false,
                attributes: ['ubigeo_id', 'code', 'name', 'level'],
                include: [
                    {
                        model: Ubigeo,
                        as: 'parent',
                        required: false,
                        attributes: ['ubigeo_id', 'code', 'name', 'level'],
                        include: [
                            {
                                model: Ubigeo,
                                as: 'parent',
                                required: false,
                                attributes: ['ubigeo_id', 'code', 'name', 'level']
                            }
                        ]
                    }
                ]
            },
            {
                model: Company,
                as: 'parentCompany',
                attributes: ['company_id', 'name'],
                required: false,
                include: [
                    {
                        model: Company,
                        as: 'subsidiaries',
                        attributes: ['company_id', 'name', 'document', 'address', 'phone', 'phone_cell', 'status', 'is_enabled', 'created_at', 'opening_time', 'closing_time'],
                        include: [
                            {
                                model: Country,
                                as: 'country',
                                attributes: ['country_id', 'country', 'flag_url']
                            },
                            {
                                model: Space,
                                as: 'spaces',
                                attributes: ['space_id', 'name', 'status_space', 'capacity'],
                                required: false
                            }
                        ]
                    }
                ]
            },
            {
                model: Configuration,
                as: 'configuration',
                required: false
            },
            {
                model: UserCompany,
                as: 'userAssignments',
                required: false,
                where: { is_active: true },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['user_id', 'first_name', 'last_name', 'email', 'is_enabled'],
                        include: [{
                            model: Person,
                            as: 'person',
                            attributes: ['phone', 'document_type', 'document_number', 'address', 'date_birth', 'country_id'],
                            include: [{
                                model: Country,
                                as: 'country',
                                attributes: ['country_id', 'country', 'iso_country']
                            }],
                            required: false
                        }]
                    },
                    {
                        model: Role,
                        as: 'role',
                        attributes: ['role_name'],
                        where: { role_name: 'super_admin' },
                        required: true
                    }
                ]
            },
            {
                model: Media,
                as: 'media',
                attributes: ['media_id', 'file_url', 'is_primary', 'type', 'category'],
                required: false,
                where: {
                    medible_type: 'Company'
                }
            },
            {
                model: Company,
                as: 'subsidiaries',
                attributes: ['company_id', 'name', 'document', 'address', 'phone', 'phone_cell', 'status', 'is_enabled', 'created_at', 'opening_time', 'closing_time'],
                include: [
                    {
                        model: Country,
                        as: 'country',
                        attributes: ['country_id', 'country', 'flag_url']
                    },
                    {
                        model: Space,
                        as: 'spaces',
                        attributes: ['space_id', 'name', 'status_space', 'capacity'],
                        required: false
                    },
                    {
                        model: ConfigurationPayment,
                        as: 'paymentConfigurations',
                        required: false
                    }
                ],
                required: false
            },
            {
                model: Space,
                as: 'spaces',
                required: false,
                include: [
                    {
                        model: SurfaceType,
                        as: 'surfaceType',
                        attributes: ['surface_type_id', 'name']
                    },
                    {
                        model: SportType,
                        as: 'sportType',
                        attributes: ['sport_type_id', 'name']
                    },
                    {
                        model: SportCategory,
                        as: 'sportCategory',
                        attributes: ['sport_category_id', 'name']
                    },
                    {
                        model: Media,
                        as: 'media',
                        attributes: ['file_url', 'type']
                    }
                ]
            }
        ]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Company.findOne(options);
};

/**
 * Obtiene sucursales habilitadas para el portal de reservas con filtros y paginación.
 * @param {object} options
 *   country_id   — filtra por país
 *   ubigeo_id    — filtra por zona geográfica (distrito/provincia/departamento)
 *   search       — búsqueda por nombre (iLike)
 *   sport        — nombre del deporte (filtra en INNER JOIN de sportType)
 *   parking      — si true, solo sucursales con estacionamiento
 *   open_now     — si true, solo sucursales abiertas en este momento
 *   sort_by      — 'distance'|'price_asc'|'price_desc'|'name' (distance = sin order en DB)
 *   limit        — null cuando se usa Haversine (se pagina en JS), número cuando se pagina en DB
 *   offset       — null cuando se usa Haversine, número cuando se pagina en DB
 * @returns {{ rows: Company[], count: number }}
 */
const getActiveSubsidiaries = async ({
    country_id,
    ubigeo_id,
    search,
    sport,
    parking,
    open_now,
    sort_by = 'distance',
    limit = null,
    offset = null
} = {}) => {
    // Condiciones base: solo sucursales activas ────────────────────────────────
    const where = {
        parent_company_id: { [Op.ne]: null },
        status:     'ACTIVE',
        is_enabled: 'A'
    };

    // Filtro por país ───────────────────────────────────────────────────────────
    if (country_id) where.country_id = country_id;

    // Filtro por zona geográfica (ubigeo resuelto en el Service) ───────────────
    if (ubigeo_id) where.ubigeo_id = ubigeo_id;

    // Búsqueda por nombre de sucursal (case-insensitive) ───────────────────────
    if (search) where.name = { [Op.iLike]: `%${search}%` };

    // Filtro por estacionamiento ────────────────────────────────────────────────
    if (parking === true) where.parking_available = true;

    // Filtro por horario de atención actual ────────────────────────────────────
    if (open_now === true) {
        // Hora actual en formato HH:MM:SS para comparar con opening_time/closing_time ─
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // "HH:MM:SS"
        where.opening_time = { [Op.lte]: currentTime };
        where.closing_time = { [Op.gte]: currentTime };
    }

    // Ordenamiento en DB (distance no se ordena aquí, el Service lo hace post-Haversine) ─
    let order = [['name', 'ASC']]; // default
    if (sort_by === 'price_asc')  order = [['min_price', 'ASC']];
    if (sort_by === 'price_desc') order = [['min_price', 'DESC']];
    if (sort_by === 'name')       order = [['name', 'ASC']];

    // Include de espacios — si hay filtro de deporte se convierte en INNER JOIN ─
    const spaceInclude = {
        model: Space,
        as: 'spaces',
        required: true, // INNER JOIN: solo sucursales con al menos un espacio activo
        include: [
            {
                model: SportType,
                as: 'sportType',
                attributes: ['name'],
                // Si se filtra por deporte se agrega WHERE al join ──────────────
                ...(sport ? { where: { name: { [Op.iLike]: `%${sport}%` } } } : {})
            }
        ],
        attributes: ['space_id', 'name']
    };

    // Opciones de la query ─────────────────────────────────────────────────────
    const queryOptions = {
        where,
        distinct: true,         // evita contar filas duplicadas por el JOIN de spaces ─
        col: 'company_id',      // columna de referencia para el distinct count ────────
        include: [
            {
                // Moneda e info del país donde opera la sucursal ───────────────
                model: Country,
                as: 'country',
                attributes: ['iso_currency', 'currency', 'currency_simbol']
            },
            spaceInclude,
            {
                model: Media,
                as: 'media',
                where: { is_primary: true, medible_type: 'Company' },
                required: false,
                attributes: ['file_url', 'is_primary', 'type']
            },
            {
                model: Configuration,
                as: 'configuration',
                required: false,
                attributes: ['config_id', 'social_whatsapp', 'social_facebook', 'social_instagram']
            }
        ],
        order,
        // Paginación a nivel DB solo cuando no se usa Haversine (limit es número) ─
        ...(limit !== null && { limit, offset: offset ?? 0 })
    };

    return await Company.findAndCountAll(queryOptions);
};

/**
 * Busca un país por su código ISO (ej. "PE", "CO").
 * @param {string} iso_country — Código ISO 2 o 3 letras
 * @returns {Country|null}
 */
const findCountryByIso = async (iso_country) => {
    return await Country.findOne({ where: { iso_country } });
};

/**
 * Busca un ubigeo por nombre y nivel geográfico.
 * @param {string} name  — Nombre del ubigeo (ej. "San Isidro", "Lima", "Lima")
 * @param {number} level — Nivel: 1=departamento, 2=provincia, 3=distrito
 * @returns {Ubigeo|null}
 */
const findUbigeoByNameAndLevel = async (name, level) => {
    return await Ubigeo.findOne({
        where: {
            name:  { [Op.iLike]: name },
            level: Number(level)
        }
    });
};

// Toggle enabled status of a company and sucursal -- Eliminar compañía (soft delete)
const toggleCompanyEnabled = async (companyId, userId, transaction = null) => {
    // First get the current company to check its status
    const company = await findById(companyId, transaction);
    if (!company) {
        return null;
    }

    // Toggle the is_enabled field
    const newEnabledStatus = company.is_enabled === 'A' ? 'I' : 'A';

    const updateData = {
        is_enabled: newEnabledStatus,
        user_update: userId
    };

    return await update(companyId, updateData, transaction);
};

module.exports = {
    create,
    findById,
    findByDocument,
    findAll,
    update,
    existsByDocument,
    existsParentByDocument,
    findParents,
    findByCountry,
    findNearby,
    validateCountryExists,
    validateParentCompanyExists,
    getCompanyDetails,
    getActiveSubsidiaries,
    findCountryByIso,
    findUbigeoByNameAndLevel,
    toggleCompanyEnabled
};
