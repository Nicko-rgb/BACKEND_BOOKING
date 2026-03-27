/**
 * Repository para Space - Capa de acceso a datos
 * 
 * Maneja todas las operaciones de base de datos relacionadas con los espacios deportivos.
 */
const { Op, where } = require('sequelize');
const Space = require('../models/Space');
const models = require('../models');
const { Media } = require('../../media/models');
const { SurfaceType, SportType, SportCategory, Country } = require('../../catalogs/models');

/**
 * Crear un nuevo espacio deportivo
 */
const create = async (spaceData, transaction = null) => {
    const options = transaction ? { transaction } : {};
    const space = await Space.create(spaceData, options);
    return await findById(space.space_id, transaction);
};

/**
 * Buscar un espacio por su ID con todos sus detalles (incluye horarios para compatibilidad)
 */
const findById = async (id, transaction = null) => {
    const options = {
        where: { space_id: id },
        include: [
            {
                model: models.Company,
                as: 'sucursal',
                attributes: ['company_id', 'name', 'tenant_id', 'address', 'opening_time', 'closing_time'],
                // Include Country para obtener currency_simbol en la respuesta de disponibilidad ─
                include: [
                    {
                        model: Country,
                        as: 'country',
                        attributes: ['country_id', 'currency_simbol', 'iso_currency']
                    }
                ]
            },
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
                attributes: ['media_id', 'file_url', 'type', 'description', 'is_primary']
            },
            {
                model: models.BusinessHour,
                as: 'businessHours',
                required: false,
                attributes: ['hour_id', 'day_of_week', 'start_time', 'end_time', 'price', 'is_closed']
            }
        ]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Space.findOne(options);
};

/**
 * Buscar detalles básicos de un espacio por su ID (SIN horarios)
 */
const findBasicById = async (id, transaction = null) => {
    const options = {
        where: { space_id: id },
        include: [
            {
                model: models.Company,
                as: 'sucursal',
                attributes: ['company_id', 'name', 'tenant_id', 'address', 'opening_time', 'closing_time'],
                include: [
                    {
                        model: Country,
                        as: 'country',
                        attributes: ['country_id', 'country', 'currency_simbol', 'iso_currency']
                    }
                ]
            },
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
                attributes: ['media_id', 'file_url', 'type', 'description', 'is_primary']
            }
        ]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Space.findOne(options);
};

/**
 * Buscar solo los horarios de un espacio y reservas
 */
const findSchedulesBySpaceId = async (id, transaction = null) => {
    const options = {
        where: { space_id: id },
        attributes: ['space_id', 'name', 'status_space', 'booking_buffer_minutes', 'minimum_booking_minutes'],
        include: [
            {
                model: models.BusinessHour,
                as: 'businessHours',
                where: { is_closed: false },
                required: false, // Permitir espacios sin horarios configurados aún
                attributes: ['hour_id', 'day_of_week', 'start_time', 'end_time', 'price', 'is_closed']
            },
            {
                model: SportType,
                as: 'sportType',
                attributes: ['name']
            },
            {
                model: models.Company,
                as: 'sucursal',
                attributes: ['company_id', 'name', 'address', 'opening_time', 'closing_time'],
                // Country anidado para obtener currency_simbol e iso_currency ─────────
                include: [
                    {
                        model: Country,
                        as: 'country',
                        attributes: ['country_id', 'currency_simbol', 'iso_currency']
                    }
                ]
            }
        ]
    };

    if (transaction) {
        options.transaction = transaction;
    }

    return await Space.findOne(options);
};

/**
 * Actualizar un espacio deportivo
 */
const update = async (id, updateData, transaction = null) => {
    const options = {
        where: { space_id: id }
    };

    if (transaction) {
        options.transaction = transaction;
    }

    await Space.update(updateData, options);
    return await findById(id, transaction);
};

module.exports = {
    create,
    findById,
    findBasicById,
    findSchedulesBySpaceId,
    update
};
