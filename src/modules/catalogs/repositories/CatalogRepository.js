/**
 * CatalogRepository.js
 * Repositorio genérico de catálogos — única capa con acceso a Sequelize.
 * Todas las operaciones reciben el Model como parámetro para ser reutilizables
 * con cualquier entidad de catálogo (Country, SportType, PaymentType, etc.).
 *
 * Reglas:
 *  - No lanza errores de negocio (eso lo hace el Service).
 *  - No conoce permisos ni validaciones.
 *  - Solo lectura/escritura.
 */

const { Op } = require('sequelize');

/**
 * Lista paginada con filtros exactos y búsqueda por texto.
 * @param {import('sequelize').ModelStatic} Model
 * @param {Object} options
 * @param {Object} [options.where]    - Cláusula where ya construida
 * @param {Array}  [options.include]  - Asociaciones a cargar
 * @param {Array}  [options.order]    - Orden
 * @param {number} [options.limit]
 * @param {number} [options.offset]
 */
const findAll = async (Model, { where = {}, include = [], order = [], limit, offset } = {}) => {
    const { rows, count } = await Model.findAndCountAll({
        where, include, order, limit, offset, distinct: true
    });
    return { rows, count };
};

// Busca por PK ────────────────────────────────────────────────────────────────
const findByPk = async (Model, pk, { include = [] } = {}) => {
    return Model.findByPk(pk, { include });
};

// Busca uno por condiciones ───────────────────────────────────────────────────
const findOne = async (Model, where) => Model.findOne({ where });

// Crea un registro ────────────────────────────────────────────────────────────
const create = async (Model, data) => Model.create(data);

/**
 * Actualiza parcialmente por PK.
 * @returns {boolean} true si se actualizó alguna fila
 */
const update = async (Model, pk, data, pkField) => {
    const [affected] = await Model.update(data, { where: { [pkField]: pk } });
    return affected > 0;
};

// Elimina por PK ──────────────────────────────────────────────────────────────
const destroy = async (Model, pk, pkField) => {
    return Model.destroy({ where: { [pkField]: pk } });
};

/**
 * Invierte el valor de un campo booleano (is_active, is_enabled).
 * Devuelve la entidad actualizada o null si no existe.
 */
const toggleField = async (Model, pk, pkField, field) => {
    const entity = await Model.findByPk(pk);
    if (!entity) return null;
    await entity.update({ [field]: !entity[field] });
    return entity;
};

module.exports = {
    Op,
    findAll,
    findByPk,
    findOne,
    create,
    update,
    destroy,
    toggleField,
};
