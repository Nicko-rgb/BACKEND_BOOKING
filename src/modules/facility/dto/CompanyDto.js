/**
 * DTO para validación de datos de Company
 * 
 * Define las reglas de validación y transformación de datos
 * para el registro y actualización de compañías deportivas.
 */
const Joi = require('joi');
const { ValidationError } = require('../../../shared/errors/CustomErrors');

/**
 * Schema de validación para crear una nueva compañía o sucursal
 */
const createCompanyDto = Joi.object({
    country_id: Joi.alternatives()
        .try(
            Joi.number().integer().positive(),
            Joi.string().regex(/^\d+$/).custom(v => parseInt(v, 10))
        )
        .required()
        .messages({
            'number.base': 'El ID del país debe ser un número',
            'number.integer': 'El ID del país debe ser un número entero',
            'number.positive': 'El ID del país debe ser positivo',
            'any.required': 'El país es obligatorio'
        }),

    tenant_id: Joi.any().forbidden(),

    name: Joi.string()
        .min(2)
        .max(200)
        .trim()
        .required()
        .messages({
            'string.base': 'El nombre debe ser una cadena',
            'string.min': 'El nombre debe tener al menos 2 caracteres',
            'string.max': 'El nombre no puede exceder 200 caracteres',
            'any.required': 'El nombre es obligatorio'
        }),

    address: Joi.string()
        .min(10)
        .max(500)
        .trim()
        .required()
        .messages({
            'string.base': 'La dirección debe ser una cadena',
            'string.min': 'La dirección debe tener al menos 10 caracteres',
            'string.max': 'La dirección no puede exceder 500 caracteres',
            'any.required': 'La dirección es obligatoria'
        }),

    // Nivel 3 de ubigeo (distrito/ciudad) — obligatorio
    ubigeo_id: Joi.alternatives()
        .try(
            Joi.number().integer().positive(),
            Joi.string().regex(/^\d+$/).custom(v => parseInt(v, 10))
        )
        .required()
        .messages({
            'number.base': 'El ID geográfico debe ser un número',
            'number.positive': 'El ID geográfico debe ser positivo',
            'alternatives.match': 'El distrito/ciudad es obligatorio',
            'any.required': 'El distrito/ciudad es obligatorio'
        }),

    phone_cell: Joi.string()
        .pattern(/^[+]?[0-9\s\-()]{9,20}$/)
        .required()
        .messages({
            'string.base': 'El teléfono celular debe ser una cadena',
            'string.pattern.base': 'El teléfono celular debe tener un formato válido',
            'any.required': 'El teléfono celular es obligatorio'
        }),

    phone: Joi.string()
        .pattern(/^[+]?[0-9\s\-()]{7,20}$/)
        .optional()
        .allow('', null)
        .messages({
            'string.base': 'El teléfono debe ser una cadena',
            'string.pattern.base': 'El teléfono debe tener un formato válido'
        }),

    website: Joi.string()
        .uri()
        .max(255)
        .optional()
        .allow('')
        .messages({
            'string.base': 'El sitio web debe ser una cadena',
            'string.uri': 'El sitio web debe ser una URL válida',
            'string.max': 'El sitio web no puede exceder 255 caracteres'
        }),

    document: Joi.string()
        .pattern(/^[0-9A-Z\-]{8,20}$/)
        .required()
        .messages({
            'string.base': 'El documento debe ser una cadena',
            'string.pattern.base': 'El documento debe tener un formato válido (8-20 caracteres alfanuméricos)',
            'any.required': 'El documento es obligatorio'
        }),

    postal_code: Joi.string()
        .pattern(/^[0-9A-Z\-\s]{3,20}$/)
        .optional()
        .allow('')
        .messages({
            'string.base': 'El código postal debe ser una cadena',
            'string.pattern.base': 'El código postal debe tener un formato válido'
        }),

    latitude: Joi.alternatives()
        .try(
            Joi.number().min(-90).max(90),
            Joi.string().allow('').custom(v => v === '' ? null : parseFloat(v))
        )
        .optional()
        .messages({
            'number.base': 'La latitud debe ser un número',
            'number.min': 'La latitud debe estar entre -90 y 90',
            'number.max': 'La latitud debe estar entre -90 y 90'
        }),

    longitude: Joi.alternatives()
        .try(
            Joi.number().min(-180).max(180),
            Joi.string().allow('').custom(v => v === '' ? null : parseFloat(v))
        )
        .optional()
        .messages({
            'number.base': 'La longitud debe ser un número',
            'number.min': 'La longitud debe estar entre -180 y 180',
            'number.max': 'La longitud debe estar entre -180 y 180'
        }),

    description: Joi.string()
        .max(1000)
        .trim()
        .optional()
        .allow('')
        .messages({
            'string.base': 'La descripción debe ser una cadena',
            'string.max': 'La descripción no puede exceder 1000 caracteres'
        }),

    parking_available: Joi.alternatives()
        .try(
            Joi.boolean(),
            Joi.string().valid('true', 'false').custom(v => v === 'true')
        )
        .default(false)
        .messages({
            'boolean.base': 'El campo de estacionamiento debe ser verdadero o falso'
        }),

    parent_company_id: Joi.alternatives()
        .try(
            Joi.number().integer().positive(),
            Joi.string().regex(/^\d+$/).custom(v => parseInt(v, 10))
        )
        .optional()
        .allow(null)
        .messages({
            'number.base': 'El ID de la compañía padre debe ser un número',
            'number.integer': 'El ID de la compañía padre debe ser un número entero'
        }),

    opening_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
        .optional()
        .allow(null, '')
        .messages({
            'string.pattern.base': 'El horario de apertura debe tener un formato de hora válido (HH:mm o HH:mm:ss)'
        }),

    closing_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
        .optional()
        .allow(null, '')
        .messages({
            'string.pattern.base': 'El horario de cierre debe tener un formato de hora válido (HH:mm o HH:mm:ss)'
        }),

    min_price: Joi.alternatives()
        .try(
            Joi.number().min(0),
            Joi.string().allow('').custom(v => v === '' ? null : parseFloat(v))
        )
        .optional()
        .allow(null)
        .messages({
            'number.base': 'El precio mínimo debe ser un número',
            'number.min': 'El precio mínimo no puede ser negativo'
        }),

    features: Joi.string()
        .max(1000)
        .trim()
        .optional()
        .allow(null, '')
        .messages({
            'string.max': 'Las características no pueden exceder 1000 caracteres'
        }),

    is_enabled: Joi.any().forbidden()
});

/**
 * Schema de validación para actualizar una compañía o sucursal existente
 */
const updateCompanyDto = Joi.object({
    country_id: Joi.alternatives()
        .try(
            Joi.number().integer().positive(),
            Joi.string().regex(/^\d+$/).custom(v => parseInt(v, 10))
        )
        .optional(),

    name: Joi.string()
        .min(2)
        .max(200)
        .trim()
        .optional(),

    address: Joi.string()
        .min(10)
        .max(500)
        .trim()
        .optional(),

    // Nivel 3 de ubigeo (distrito/ciudad) — obligatorio también en edición
    ubigeo_id: Joi.alternatives()
        .try(
            Joi.number().integer().positive(),
            Joi.string().regex(/^\d+$/).custom(v => parseInt(v, 10))
        )
        .required()
        .messages({
            'number.base': 'El ID geográfico debe ser un número',
            'number.positive': 'El ID geográfico debe ser positivo',
            'alternatives.match': 'El distrito/ciudad es obligatorio',
            'any.required': 'El distrito/ciudad es obligatorio'
        }),

    phone_cell: Joi.string()
        .pattern(/^[+]?[0-9\s\-()]{9,20}$/)
        .optional(),

    phone: Joi.string()
        .pattern(/^[+]?[0-9\s\-()]{7,20}$/)
        .optional(),

    website: Joi.string()
        .uri()
        .max(255)
        .optional()
        .allow(''),

    document: Joi.string()
        .pattern(/^[0-9A-Z\-]{8,20}$/)
        .optional(),

    postal_code: Joi.string()
        .pattern(/^[0-9A-Z\-\s]{3,20}$/)
        .optional()
        .allow(''),

    latitude: Joi.alternatives()
        .try(
            Joi.number().min(-90).max(90),
            Joi.string().allow('').custom(v => v === '' ? null : parseFloat(v))
        )
        .optional(),

    longitude: Joi.alternatives()
        .try(
            Joi.number().min(-180).max(180),
            Joi.string().allow('').custom(v => v === '' ? null : parseFloat(v))
        )
        .optional(),

    description: Joi.string()
        .max(1000)
        .trim()
        .optional()
        .allow(''),

    parking_available: Joi.alternatives()
        .try(
            Joi.boolean(),
            Joi.string().valid('true', 'false').custom(v => v === 'true')
        )
        .optional(),

    parent_company_id: Joi.any().forbidden(), // No se puede cambiar a sucursal una vez creado

    status: Joi.string()
        .valid('ACTIVE', 'INACTIVE')
        .optional(),

    is_enabled: Joi.string()
        .valid('A', 'I')
        .optional(),

    opening_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
        .optional()
        .allow(null, ''),

    closing_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
        .optional()
        .allow(null, ''),

    min_price: Joi.alternatives()
        .try(
            Joi.number().min(0),
            Joi.string().allow('').custom(v => v === '' ? null : parseFloat(v))
        )
        .optional()
        .allow(null),

    features: Joi.string()
        .max(1000)
        .trim()
        .optional()
        .allow(null, ''),

    user_update: Joi.any().forbidden()
});

/**
 * Schema de validación para parámetros de consulta
 */
const queryParamsSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),

    status: Joi.string()
        .valid('ACTIVE', 'INACTIVE')
        .optional(),

    country_id: Joi.number()
        .integer()
        .positive()
        .optional(),

    search: Joi.string()
        .max(100)
        .trim()
        .optional()
});

/**
 * Clase DTO para Company
 */
class CompanyDto {
    /**
     * Valida los datos para crear una nueva compañía
     * @param {Object} data - Datos a validar
     * @returns {Object} - Datos validados y transformados
     */
    static validateCreate(data) {
        const { error, value } = createCompanyDto.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            throw new ValidationError('Datos de entrada inválidos', validationErrors);
        }

        return value;
    }

    /**
     * Valida los datos para actualizar una compañía
     * @param {Object} data - Datos a validar
     * @returns {Object} - Datos validados y transformados
     */
    static validateUpdate(data) {
        const { error, value } = updateCompanyDto.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            throw new ValidationError('Datos de entrada inválidos', validationErrors);
        }

        return value;
    }

    /**
     * Valida los parámetros de consulta
     * @param {Object} query - Parámetros de consulta
     * @returns {Object} - Parámetros validados
     */
    static validateQuery(query) {
        const { error, value } = queryParamsSchema.validate(query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            throw new ValidationError('Parámetros de consulta inválidos', validationErrors);
        }

        return value;
    }

    /**
     * Helper para mapear una sucursal de forma ligera
     * @private
     */
    static _mapSubsidiary(sub) {
        if (!sub) return null;

        // Extraer medios si existen para la sucursal
        let logo_url = null;
        let banner_url = null;

        if (sub.media && Array.isArray(sub.media)) {
            const logoMedia = sub.media.find(m => m.category === 'PROFILE' && m.is_primary);
            const bannerMedia = sub.media.find(m => m.category === 'COVER' && m.is_primary);

            if (logoMedia) logo_url = logoMedia.file_url;
            if (bannerMedia) banner_url = bannerMedia.file_url;

            if (!logo_url) {
                const anyLogo = sub.media.find(m => m.category === 'PROFILE');
                if (anyLogo) logo_url = anyLogo.file_url;
            }
            if (!banner_url) {
                const anyBanner = sub.media.find(m => m.category === 'COVER');
                if (anyBanner) banner_url = anyBanner.file_url;
            }
        }

        return {
            sucursal_id: sub.company_id,
            name: sub.name,
            document: sub.document,
            address: sub.address,
            phone: sub.phone,
            phone_cell: sub.phone_cell,
            status: sub.status,
            is_enabled: sub.is_enabled,
            created_at: sub.created_at,
            open_time: sub.opening_time,
            close_time: sub.closing_time,
            logo_url: logo_url,
            banner_url: banner_url,
            // Solo incluimos la cantidad de espacios para ahorrar datos
            spaces_count: sub.spaces ? sub.spaces.length : 0,
            // Para compatibilidad con vistas que esperan la lista mínima
            spaces: sub.spaces ? sub.spaces.map(s => ({
                space_id: s.space_id,
                name: s.name,
                status: s.status_space
            })) : [],
            country: sub.country ? {
                country_id: sub.country.country_id,
                name: sub.country.country
            } : null,
            // Configuraciones de métodos de pago (necesario para PaymentMethodsFlow)
            paymentConfigurations: sub.paymentConfigurations
                ? sub.paymentConfigurations.map(pc => ({
                    configuration_payment_id: pc.configuration_payment_id,
                    payment_type_id: pc.payment_type_id,
                    is_enabled: pc.is_enabled,
                    sort_order: pc.sort_order,
                    is_default: pc.is_default
                }))
                : []
        };
    }

    /**
     * Transforma los datos de salida para el cliente
     * @param {Object} company - Datos de la compañía
     * @returns {Object} - Datos transformados
     */
    static toResponse(company) {
        if (!company) return null;

        // Extraer medios si existen
        let logo_url = null;
        let banner_url = null;

        if (company.media && Array.isArray(company.media)) {
            const logoMedia = company.media.find(m => m.category === 'PROFILE' && m.is_primary);
            const bannerMedia = company.media.find(m => m.category === 'COVER' && m.is_primary);

            if (logoMedia) logo_url = logoMedia.file_url;
            if (bannerMedia) banner_url = bannerMedia.file_url;

            // Fallback si no hay marcados como primarios pero hay de la categoría
            if (!logo_url) {
                const anyLogo = company.media.find(m => m.category === 'PROFILE');
                if (anyLogo) logo_url = anyLogo.file_url;
            }
            if (!banner_url) {
                const anyBanner = company.media.find(m => m.category === 'COVER');
                if (anyBanner) banner_url = anyBanner.file_url;
            }
        }

        const response = {
            company_id: company.company_id,
            tenant_id: company.tenant_id,
            country_id: company.country_id,  // FK directo — necesario para pre-llenar el select de país ──
            name: company.name,
            address: company.address,
            phone_cell: company.phone_cell,
            phone: company.phone,
            website: company.website,
            document: company.document,
            postal_code: company.postal_code,
            latitude: company.latitude,
            longitude: company.longitude,
            status: company.status,
            description: company.description,
            parking_available: company.parking_available,
            parent_company_id: company.parent_company_id,
            is_enabled: company.is_enabled,
            created_at: company.created_at,
            updated_at: company.updated_at,

            // Medios (Logo y Banner) a nivel superior ────────────────────────
            logo_url: logo_url,
            banner_url: banner_url,

            // Identificador geográfico ────────────────────────────────────────
            ubigeo_id: company.ubigeo_id || null,
            // Jerarquía geográfica completa ───────────────────────────────────
            ubigeo: company.ubigeo ? {
                ubigeo_id: company.ubigeo.ubigeo_id,
                code: company.ubigeo.code,
                name: company.ubigeo.name,
                level: company.ubigeo.level,
                parent: company.ubigeo.parent ? {
                    ubigeo_id: company.ubigeo.parent.ubigeo_id,
                    code: company.ubigeo.parent.code,
                    name: company.ubigeo.parent.name,
                    level: company.ubigeo.parent.level,
                    parent: company.ubigeo.parent.parent ? {
                        ubigeo_id: company.ubigeo.parent.parent.ubigeo_id,
                        code: company.ubigeo.parent.parent.code,
                        name: company.ubigeo.parent.parent.name,
                        level: company.ubigeo.parent.parent.level
                    } : null
                } : null
            } : null,

            // Relaciones principales ──────────────────────────────────────────
            country: company.country ? {
                country_id: company.country.country_id,
                name: company.country.country,
                flag: company.country.flag_url
            } : null,

            configuration: company.configuration ? {
                config_id: company.configuration.config_id,
                logo_url: logo_url,
                banner_url: banner_url,
                social_facebook: company.configuration.social_facebook,
                social_instagram: company.configuration.social_instagram,
                social_whatsapp: company.configuration.social_whatsapp,
                social_tiktok: company.configuration.social_tiktok
            } : null,

            // Propietario (super_admin) de la empresa
            owner: (() => {
                // role es varchar clasificador (no FK) — filtrar directamente ──
                const assignment = company.userAssignments?.find(a => a.role === 'super_admin');
                if (!assignment) return null;
                const u = assignment.user || {};
                const p = u.person || {};
                return {
                    user_id: u.user_id,
                    first_name: u.first_name,
                    last_name: u.last_name,
                    email: u.email,
                    is_enabled: u.is_enabled,
                    phone: p.phone || null,
                    document_type: p.document_type || null,
                    document_number: p.document_number || null,
                    address: p.address || null,
                    date_birth: p.date_birth || null,
                    country_name: p.country?.country || null,
                    country_iso: p.country?.iso_country || null,
                };
            })(),

            opening_time: company.opening_time,
            closing_time: company.closing_time,
            min_price: company.min_price,
            features: company.features ? (typeof company.features === 'string' ? company.features.split(',').map(f => f.trim()).filter(Boolean) : company.features) : []
        };

        // Si tiene sucursales (es una empresa principal), las incluimos
        if (company.subsidiaries && company.subsidiaries.length > 0) {
            response.subsidiaries = company.subsidiaries.map(sub => this._mapSubsidiary(sub));
        }

        // Espacios propios (solo si los tiene cargados directamente)
        if (company.spaces && company.spaces.length > 0) {
            response.spaces = company.spaces.map(space => ({
                space_id: space.space_id,
                name: space.name,
                capacity: space.capacity,
                status: space.status_space,
                equipment: Array.isArray(space.equipment)
                    ? space.equipment
                    : (space.equipment && typeof space.equipment === 'string'
                        ? space.equipment.split(',').map(e => e.trim()).filter(Boolean)
                        : []),
                sportType: space.sportType ? {
                    id: space.sportType.sport_type_id,
                    name: space.sportType.name
                } : null,
                category: space.sportCategory ? {
                    name: space.sportCategory.name
                } : null,
                surface: space.surfaceType ? {
                    name: space.surfaceType.name
                } : null,
                media: space.media ? space.media.map(m => ({
                    url: m.file_url,
                    type: m.type
                })) : []
            }));
        }

        return response;
    }

    /**
     * Data transfer para lista de sucursales en BOOKING SPORT.
     * Incluye moneda del país de la sucursal y distancia desde el usuario (si aplica).
     */
    static toResponseBSList(sucursales) {
        if (!sucursales) return [];
        const sucursalesArray = Array.isArray(sucursales) ? sucursales : [sucursales];

        return sucursalesArray.map(sucursal => {
            // El service ya llamó .get({ plain: true }) internamente y guardó _distance_km ─
            const data = sucursal.get ? sucursal.get({ plain: true }) : sucursal;
            const { processed_data } = data;

            // Redondear distancia a 1 decimal (ej: 3.7 km) ─────────────────────
            const distance_km = data._distance_km != null
                ? Math.round(data._distance_km * 10) / 10
                : null;

            return {
                sucursal_id: data.company_id,
                name_sucursal: data.name,
                address: data.address,
                sports: processed_data?.sports || [],
                primary_photo: processed_data?.primary_photo,
                price: data.min_price || 0,
                // Moneda del país donde opera la sucursal — null si no viene el include
                currency_simbol: data.country?.currency_simbol ?? null,
                iso_currency: data.country?.iso_currency ?? null,
                opening_time: data.opening_time,
                closing_time: data.closing_time,
                features: processed_data?.features || [],
                // Coordenadas (útiles para mapas en el frontend) ─────────────
                latitude: data.latitude,
                longitude: data.longitude,
                // Distancia calculada por Haversine (null si no hay coords) ──
                distance_km,
                // Promedio de calificaciones aprobadas ────────────────────────
                rating: data.avg_rating != null ? Number(data.avg_rating) : 0
            };
        });
    }

    /**
     * Data transfer para data completa de sucursal para BOOKING SPORT
     */
    static toResponseBSData(sucursal) {
        if (!sucursal) return null;
        const data = sucursal.get ? sucursal.get({ plain: true }) : sucursal;

        return {
            sucursal_id: data.company_id,
            name: data.name,
            address: data.address,
            phone: data.phone_cell || data.phone,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            min_price: data.min_price,
            // Promedio de calificaciones aprobadas ────────────────────────────
            rating: data.avg_rating != null ? Number(data.avg_rating) : 0,
            // Moneda del país donde opera la sucursal ────────────────────────
            currency_simbol: data.country?.currency_simbol ?? null,
            iso_currency: data.country?.iso_currency ?? null,
            opening_time: data.opening_time,
            closing_time: data.closing_time,
            features: data.features ? (typeof data.features === 'string' ? data.features.split(',').map(f => f.trim()).filter(Boolean) : data.features) : [],
            primary_photo: data.media?.find(m => m.is_primary)?.file_url
                || data.media?.[0]?.file_url
                || null,
            // Redes sociales y contacto desde la configuración de la sucursal
            social_whatsapp: data.configuration?.social_whatsapp || null,
            whatsapp_message: data.configuration?.whatsapp_message || null,
            social_facebook: data.configuration?.social_facebook || null,
            social_instagram: data.configuration?.social_instagram || null,
            social_tiktok: data.configuration?.social_tiktok || null,
            social_youtube: data.configuration?.social_youtube || null,
            spaces: data.spaces ? data.spaces.map(space => ({
                space_id: space.space_id,
                name: space.name,
                capacity: space.capacity,
                dimensions: space.dimensions,
                price: space.price,
                status: space.status_space,
                equipment: Array.isArray(space.equipment)
                    ? space.equipment
                    : (space.equipment && typeof space.equipment === 'string'
                        ? space.equipment.split(',').map(e => e.trim()).filter(Boolean)
                        : []),
                sport: space.sportType ? {
                    name: space.sportType.name,
                    sport_type: space.sportType.name
                } : null,
                category: space.sportCategory ? {
                    name: space.sportCategory.name
                } : null,
                surface: space.surfaceType ? {
                    name: space.surfaceType.name
                } : null,
                media: space.media ? space.media.map(m => ({
                    url: m.file_url,
                    type: m.type
                })) : []
            })) : []
        };
    }
}

/**
 * Schema de validación para query params del endpoint público de sucursales.
 * Soporta proximidad GPS, fallback por ubigeo, filtros de deporte/amenidades y paginación.
 */
const publicSucursalQueryDto = Joi.object({
    // Coordenadas GPS del usuario — activa ordenamiento Haversine ─────────────
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    radius_km: Joi.number().positive().max(500).default(50),
    // País del usuario — SIEMPRE enviado desde el frontend ────────────────────
    iso_country: Joi.string().min(2).max(3).uppercase(),
    // Fallback geográfico cuando no hay GPS (nivel 1=dept, 2=prov, 3=dist) ────
    ubigeo_name: Joi.string().max(100),
    ubigeo_level: Joi.number().integer().valid(1, 2, 3),
    // Filtros de contenido ─────────────────────────────────────────────────────
    search: Joi.string().max(100).allow('').default(''),
    sport: Joi.string().max(50).allow(''),
    open_now: Joi.boolean(),
    parking: Joi.boolean(),
    // Ordenamiento ────────────────────────────────────────────────────────────
    sort_by: Joi.string().valid('distance', 'price_asc', 'price_desc', 'name').default('distance'),
    // Paginación — limit 500 permite cargar todos los pins en la vista de mapa ─
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(500).default(12),
});

module.exports = {
    CompanyDto,
    createCompanyDto,
    updateCompanyDto,
    queryParamsSchema,
    publicSucursalQueryDto
};
