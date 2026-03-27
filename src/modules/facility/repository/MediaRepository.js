/**
 * Repository para Media - Capa de acceso a datos
 * 
 * Maneja todas las operaciones de base de datos relacionadas con los archivos multimedia.
 */
const { Op } = require('sequelize');
const Media = require('../../media/models/Media');
const models = require('../models');

/**
 * Crear un nuevo registro multimedia
 */
const create = async (mediaData, transaction = null) => {
    const options = transaction ? { transaction } : {};
    return await Media.create(mediaData, options);
};

/**
 * Buscar un archivo multimedia por su ID
 */
const findById = async (id, transaction = null) => {
    const options = {
        where: { media_id: id }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Media.findOne(options);
};

/**
 * Actualizar un archivo multimedia
 */
const update = async (id, updateData, transaction = null) => {
    const options = {
        where: { media_id: id }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    await Media.update(updateData, options);
    return await findById(id, transaction);
};

/**
 * Eliminar un archivo multimedia
 */
const remove = async (id, transaction = null) => {
    const options = {
        where: { media_id: id }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Media.destroy(options);
};

/**
 * Quita la marca de principal de todos los archivos de un modelo relacionado
 */
const unsetPrimaryByMedible = async (medibleId, medibleType, transaction = null) => {
    const options = {
        where: { 
            medible_id: medibleId,
            medible_type: medibleType
        }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Media.update({ is_primary: false }, options);
};

/**
 * Buscar todos los archivos multimedia de una entidad polimórfica.
 * @param {number} medibleId
 * @param {string} medibleType
 * @param {string|null} category - Filtrar por categoría (opcional)
 */
const findAllByMedible = async (medibleId, medibleType, category = null, transaction = null) => {
    const where = { medible_id: medibleId, medible_type: medibleType };
    if (category) where.category = category;
    const options = { where, order: [['created_at', 'DESC']] };
    if (transaction) options.transaction = transaction;
    return await Media.findAll(options);
};

/**
 * Buscar el archivo principal de una entidad.
 */
const findPrimaryByMedible = async (medibleId, medibleType, transaction = null) => {
    const options = { where: { medible_id: medibleId, medible_type: medibleType, is_primary: true } };
    if (transaction) options.transaction = transaction;
    return await Media.findOne(options);
};

module.exports = {
    create,
    findById,
    update,
    remove,
    unsetPrimaryByMedible,
    findAllByMedible,
    findPrimaryByMedible,
};
