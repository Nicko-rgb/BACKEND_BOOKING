/**
 * CatalogService.js
 * Servicio genérico de catálogos. Recibe un "config" por catálogo con toda
 * la información necesaria (modelo, campos únicos, filtros, etc.) y aplica
 * las reglas de negocio comunes: validaciones, chequeo de unicidad y
 * protección contra borrado con referencias.
 *
 * Config esperada por catálogo:
 * {
 *   model,              // Modelo Sequelize
 *   pkField,            // 'sport_type_id'
 *   entityLabel,        // 'tipo de deporte' — usado en mensajes
 *   entityLabelPlural,  // 'tipos de deporte' — opcional
 *   uniqueFields,       // ['code'] — valida duplicados en create/update
 *   searchableFields,   // ['code', 'name'] — búsqueda LIKE
 *   filterFields,       // ['country_id'] — filtros exactos via query
 *   activeField,        // 'is_active' | 'is_enabled' — habilita toggle
 *   include,            // Asociaciones a cargar siempre
 *   defaultOrder,       // [['name', 'ASC']]
 *   withAudit,          // true → agrega user_create/user_update
 *   checkReferences,    // async(entity) → throws ConflictError si tiene refs FK
 * }
 */

const { NotFoundError, ConflictError } = require('../../../shared/errors/CustomErrors');
const CatalogRepository = require('../repositories/CatalogRepository');
const { Op } = CatalogRepository;

/**
 * Lista paginada con búsqueda y filtros exactos.
 * Soporta ?search=, ?page=, ?limit= y cualquier filtro exacto en filterFields.
 */
const list = async (config, query = {}) => {
    const { model, searchableFields = [], filterFields = [], defaultOrder = [], include = [] } = config;
    const { search = '', page = 1, limit = 20, ...rest } = query;

    const where = {};

    // Filtros exactos (ej. country_id=3) ───────────────────────────────
    filterFields.forEach(field => {
        const value = rest[field];
        if (value !== undefined && value !== '' && value !== null) {
            where[field] = value;
        }
    });

    // Búsqueda por texto en cualquiera de los campos indicados ─────────
    if (search && searchableFields.length) {
        where[Op.or] = searchableFields.map(f => ({ [f]: { [Op.iLike]: `%${search}%` } }));
    }

    const pageNum  = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 200);
    const offset   = (pageNum - 1) * limitNum;

    const { rows, count } = await CatalogRepository.findAll(model, {
        where, include, order: defaultOrder, limit: limitNum, offset
    });

    return {
        items: rows,
        pagination: {
            total: count,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(count / limitNum)
        }
    };
};

// Obtiene un registro por PK — lanza NotFound si no existe ────────────────────
const getById = async (config, id) => {
    const entity = await CatalogRepository.findByPk(config.model, id, { include: config.include });
    if (!entity) throw new NotFoundError(`${config.entityLabel} ${id} no encontrado`);
    return entity;
};

/**
 * Garantiza que los campos únicos no choquen con otro registro.
 * En update se excluye el propio ID de la búsqueda.
 */
const ensureUnique = async (config, data, excludeId = null) => {
    const { model, pkField, uniqueFields = [] } = config;
    for (const field of uniqueFields) {
        if (data[field] === undefined || data[field] === null) continue;
        const where = { [field]: data[field] };
        if (excludeId) where[pkField] = { [Op.ne]: excludeId };
        const clash = await CatalogRepository.findOne(model, where);
        if (clash) {
            throw new ConflictError(`Ya existe un registro con ${field}='${data[field]}'`);
        }
    }
};

// Agrega campos de auditoría si el catálogo los soporta ──────────────────────
const withAudit = (config, data, user, isUpdate = false) => {
    if (!config.withAudit) return data;
    const userId = user?.id ?? user?.user_id;
    return isUpdate
        ? { ...data, user_update: userId }
        : { ...data, user_create: userId, user_update: userId };
};

const create = async (config, data, requestingUser) => {
    await ensureUnique(config, data);
    const payload = withAudit(config, data, requestingUser, false);
    const entity = await CatalogRepository.create(config.model, payload);
    return getById(config, entity[config.pkField]);
};

const update = async (config, id, data, requestingUser) => {
    await getById(config, id);
    await ensureUnique(config, data, id);
    const payload = withAudit(config, data, requestingUser, true);
    await CatalogRepository.update(config.model, id, payload, config.pkField);
    return getById(config, id);
};

/**
 * Activa/desactiva un registro — requiere que el config declare activeField.
 * Útil como "soft delete": oculta del listado público sin romper FKs.
 */
const toggleActive = async (config, id) => {
    if (!config.activeField) {
        throw new ConflictError(`${config.entityLabel} no soporta activar/desactivar`);
    }
    const updated = await CatalogRepository.toggleField(config.model, id, config.pkField, config.activeField);
    if (!updated) throw new NotFoundError(`${config.entityLabel} ${id} no encontrado`);
    return updated;
};

/**
 * Elimina físicamente. Si el config define checkReferences, valida que no haya
 * relaciones FK vivas — para evitar romper la integridad del sistema.
 */
const remove = async (config, id) => {
    const entity = await getById(config, id);
    if (config.checkReferences) await config.checkReferences(entity);
    await CatalogRepository.destroy(config.model, id, config.pkField);
    return true;
};

module.exports = { list, getById, create, update, toggleActive, remove };
