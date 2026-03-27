const Joi = require('joi');

/**
 * DTO para transformar los datos de Space entre la base de datos y la respuesta de la API
 */
class SpaceDto {
    /**
     * Transforma un objeto Space de la base de datos a un formato de respuesta
     */
    static toResponse(space) {
        if (!space) return null;

        return {
            space_id: space.space_id,
            sucursal_id: space.sucursal_id,
            name: space.name,
            description: space.description,
            status: space.status_space,
            dimensions: space.dimensions,
            capacity: space.capacity,
            equipment: space.equipment ? space.equipment.split(',').map(e => e.trim()).filter(Boolean) : [],
            booking_rules: {
                min_minutes: space.minimum_booking_minutes,
                max_minutes: space.maximum_booking_minutes,
                buffer_minutes: space.booking_buffer_minutes
            },
            sucursal: space.sucursal ? {
                id: space.sucursal.company_id,
                name: space.sucursal.name,
                address: space.sucursal.address,
                opening_time: space.sucursal.opening_time,
                closing_time: space.sucursal.closing_time
            } : null,
            country: space.sucursal?.country ? {
                id: space.sucursal.country.country_id,
                name: space.sucursal.country.country,
                currency_symbol: space.sucursal.country.currency_simbol,
                iso_currency: space.sucursal.country.iso_currency
            } : null,
            surface: space.surfaceType ? {
                id: space.surfaceType.surface_type_id,
                name: space.surfaceType.name
            } : null,
            sport: space.sportType ? {
                id: space.sportType.sport_type_id,
                name: space.sportType.name
            } : null,
            category: space.sportCategory ? {
                id: space.sportCategory.sport_category_id,
                name: space.sportCategory.name
            } : null,
            media: space.media ? space.media.map(m => ({
                id: m.media_id,
                url: m.file_url,
                type: m.type,
                description: m.description,
                is_primary: m.is_primary
            })) : [],
            businessHours: space.businessHours ? space.businessHours.map(sh => ({
                id: sh.hour_id,
                day: sh.day_of_week,
                start_time: sh.start_time,
                end_time: sh.end_time,
                price: sh.price,
                is_closed: sh.is_closed
            })) : [],
            created_at: space.created_at,
            updated_at: space.updated_at
        };
    }

    /**
     * Transforma la disponibilidad agrupada por día para la respuesta de la API
     */
    static toAvailabilityResponse(data) {
        if (!data) return null;

        return {
            space_id: data.space_id,
            sucursal_id: data.sucursal_id,
            name: data.name,
            sport: data.sport,
            sucursal: data.sucursal,
            address: data.address,
            opening_time: data.opening_time,
            closing_time: data.closing_time,
            booking_buffer: data.buffer,
            minimum_booking_minutes: data.minimum_booking_minutes,
            businessHours: data.businessHours
        };
    }
}

/**
 * Schema de validación para crear un nuevo espacio
 */
const createSpaceDto = Joi.object({
    sucursal_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(2).max(200).trim().required(),
    description: Joi.string().max(1000).optional().allow(''),
    status_space: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE').default('ACTIVE'),
    dimensions: Joi.string().max(100).required(),
    capacity: Joi.number().integer().positive().required(),
    equipment: Joi.string().max(1000).optional().allow(''),
    minimum_booking_minutes: Joi.number().integer().positive().default(60),
    maximum_booking_minutes: Joi.number().integer().positive().default(1440),
    booking_buffer_minutes: Joi.number().integer().min(0).default(15),
    sport_type_id: Joi.number().integer().positive().required(),
    surface_type_id: Joi.number().integer().positive().required(),
    sport_category_id: Joi.number().integer().positive().required()
});

/**
 * Schema de validación para actualizar un espacio
 */
const updateSpaceDto = createSpaceDto.fork(
    ['sucursal_id', 'name', 'dimensions', 'capacity', 'sport_type_id', 'surface_type_id', 'sport_category_id'],
    (schema) => schema.optional()
);

module.exports = { SpaceDto, createSpaceDto, updateSpaceDto };
