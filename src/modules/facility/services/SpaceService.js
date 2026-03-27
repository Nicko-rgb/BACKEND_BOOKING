const SpaceRepository = require('../repository/SpaceRepository');
const CompanyRepository = require('../repository/CompanyRepository');
const BusinessHourRepository = require('../repository/BusinessHourRepository');
const MediaService = require('../../media/services/MediaService');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../../shared/errors/CustomErrors');
const cacheUtility = require('../../../shared/utils/cacheUtility');

/**
 * Servicio para la gestión de espacios deportivos
 */

const buildAuditFields = (userId) => {
    if (!userId) {
        throw new BadRequestError('El ID de usuario es obligatorio para el registro de auditoría');
    }
    return { user_create: userId, user_update: userId };
};

// Verifica que el usuario tenga acceso a la sucursal del espacio
const assertScope = (sucursalId, userContext) => {
    if (!userContext || userContext.isSystem) return;
    const id = String(sucursalId);
    if (!userContext.company_ids?.map(String).includes(id)) {
        throw new ForbiddenError('No tienes acceso a este espacio');
    }
};

/**
 * Registrar un nuevo espacio deportivo
 */
const registerSpace = async (spaceData, userId, userContext = null) => {
    const { sucursal_id } = spaceData;

    if (!sucursal_id) {
        throw new BadRequestError('El ID de la sucursal es requerido');
    }

    // Verificar que la sucursal existe
    const sucursal = await CompanyRepository.findById(sucursal_id);
    if (!sucursal) {
        throw new NotFoundError('La sucursal especificada no existe');
    }

    assertScope(sucursal_id, userContext);

    const newSpaceData = {
        ...spaceData,
        sucursal_id: sucursal.company_id,
        tenant_id: sucursal.tenant_id,
        status_space: spaceData.status_space || 'ACTIVE',
        ...buildAuditFields(userId)
    };

    const newSpace = await SpaceRepository.create(newSpaceData);

    // Invalidar cache de espacios de la sucursal
    await cacheUtility.delByPattern(`spaces:sucursal:${sucursal_id}:*`);

    return newSpace;
};

/**
 * Obtener detalles de un espacio por ID
 */
const getSpaceDetails = async (spaceId, userContext = null) => {
    if (!spaceId) {
        throw new BadRequestError('El ID del espacio es requerido');
    }

    const space = await SpaceRepository.findBasicById(spaceId);
    if (!space) {
        throw new NotFoundError('El espacio deportivo no existe');
    }

    assertScope(space.sucursal_id, userContext);

    return space;
};

/**
 * Obtener solo los horarios de un espacio por ID
 */
const getSpaceSchedules = async (spaceId, userContext = null) => {
    if (!spaceId) {
        throw new BadRequestError('El ID del espacio es requerido');
    }

    if (userContext && !userContext.isSystem) {
        const space = await SpaceRepository.findById(spaceId);
        if (!space) throw new NotFoundError('El espacio deportivo no existe');
        assertScope(space.sucursal_id, userContext);
    }

    const schedules = await BusinessHourRepository.findBySpaceId(spaceId);
    return schedules;
};

/**
 * Obtener disponibilidad de un espacio por ID agrupado por día
 */
const getSpaceAvailability = async (spaceId) => {
    if (!spaceId) {
        throw new BadRequestError('El ID del espacio es requerido');
    }

    // Usar el método especializado para traer solo horarios y datos mínimos
    const space = await SpaceRepository.findSchedulesBySpaceId(spaceId);
    if (!space) {
        throw new NotFoundError('El espacio deportivo no existe');
    }

    // Mapeo de días ENUM a números (0=Domingo, 1=Lunes, ..., 6=Sábado)
    const dayMap = {
        'SUNDAY': 0,
        'MONDAY': 1,
        'TUESDAY': 2,
        'WEDNESDAY': 3,
        'THURSDAY': 4,
        'FRIDAY': 5,
        'SATURDAY': 6
    };

    // Agrupar horarios por día
    const groupedSchedules = {};
    for (let i = 0; i <= 6; i++) {
        groupedSchedules[i] = [];
    }

    if (space.businessHours) {
        space.businessHours.forEach(bh => {
            // Solo incluir horarios que no estén cerrados
            if (!bh.is_closed) {
                const dayIndex = dayMap[bh.day_of_week];
                
                // Verificar que el día mapeado exista en nuestro objeto
                if (dayIndex !== undefined && groupedSchedules[dayIndex]) {
                    groupedSchedules[dayIndex].push({
                        hour_id: bh.hour_id,
                        start_time: bh.start_time,
                        end_time: bh.end_time,
                        price: bh.price,
                        is_closed: bh.is_closed
                    });
                }
            }
        });
    }

    // Ordenar cada día por hora de inicio
    Object.keys(groupedSchedules).forEach(day => {
        groupedSchedules[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return {
        space_id:    space.space_id,
        sucursal_id: space.sucursal?.company_id,
        name:        space.name,
        sport:       space.sportType?.name || null,
        // Sucursal como objeto para incluir moneda — el frontend ya maneja ambos formatos
        sucursal: {
            name:            space.sucursal?.name    || null,
            address:         space.sucursal?.address || null,
            // Moneda del país de la sucursal — null si el include no trajo country (no fallback a Perú)
            currency_simbol: space.sucursal?.country?.currency_simbol ?? null,
            iso_currency:    space.sucursal?.country?.iso_currency    ?? null
        },
        address:                  space.sucursal?.address || null,
        opening_time:             space.sucursal?.opening_time,
        closing_time:             space.sucursal?.closing_time,
        buffer:                   space.booking_buffer_minutes || 0,
        minimum_booking_minutes:  space.minimum_booking_minutes,
        businessHours:            groupedSchedules
    };
};

/**
 * Actualizar un espacio deportivo
 */
const updateSpace = async (spaceId, updateData, userId, userContext = null) => {
    if (!spaceId) {
        throw new BadRequestError('El ID del espacio es requerido');
    }

    const currentSpace = await SpaceRepository.findById(spaceId);
    if (!currentSpace) {
        throw new NotFoundError('El espacio deportivo no existe');
    }

    assertScope(currentSpace.sucursal_id, userContext);

    if (!userId && !updateData.user_update) {
        throw new BadRequestError('El ID de usuario es obligatorio para la actualización');
    }

    const updatedData = {
        ...updateData,
        user_update: updateData.user_update || userId
    };

    const updatedSpace = await SpaceRepository.update(spaceId, updatedData);

    // Invalidar caches
    await cacheUtility.delByPattern(`spaces:sucursal:${currentSpace.sucursal_id}:*`);
    
    return updatedSpace;
};

/**
 * Crea o actualiza horarios de un espacio
 */
const createSchedules = async (spaceId, schedulesData, userId, userContext = null) => {
    if (!spaceId) {
        throw new BadRequestError('El ID del espacio es requerido');
    }

    const space = await SpaceRepository.findById(spaceId);
    if (!space) {
        throw new NotFoundError('El espacio deportivo no existe');
    }

    assertScope(space.sucursal_id, userContext);

    // Si no hay horarios nuevos, eliminamos los existentes y terminamos
    if (!schedulesData || schedulesData.length === 0) {
        await BusinessHourRepository.deleteBySpaceId(spaceId);
        return [];
    }

    // Obtener información de la sucursal para validar el rango de operación
    const sucursal = await CompanyRepository.findById(space.sucursal_id);
    const openingTime = sucursal.opening_time;
    const closingTime = sucursal.closing_time;

    // Validar solapamientos por día antes de cualquier operación en la BD
    const schedulesByDay = {};
    schedulesData.forEach(s => {
        const day = s.day_of_week || s.day;
        if (!schedulesByDay[day]) schedulesByDay[day] = [];
        schedulesByDay[day].push(s);
    });

    for (const day in schedulesByDay) {
        const daySchedules = schedulesByDay[day];
        if (daySchedules.length === 0) continue;

        // Ordenar por hora de inicio
        const sorted = [...daySchedules].sort((a, b) => a.start_time.localeCompare(b.start_time));

        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];

            // Normalizar tiempos para comparación (HH:mm)
            const currentStart = current.start_time.substring(0, 5);
            const currentEnd = current.end_time.substring(0, 5);
            const branchOpen = openingTime ? openingTime.substring(0, 5) : null;
            const branchClose = closingTime ? closingTime.substring(0, 5) : null;

            // 1. Validar integridad del bloque (inicio < fin)
            if (currentStart >= currentEnd) {
                throw new BadRequestError(`Error en ${day}: El horario ${currentStart}-${currentEnd} es inválido (inicio >= fin).`);
            }

            // 2. Validar contra el rango de la sucursal
            if (branchOpen && currentStart < branchOpen) {
                throw new BadRequestError(`Error en ${day}: El horario ${currentStart} es antes de la hora de apertura de la sucursal (${branchOpen}).`);
            }
            if (branchClose && currentEnd > branchClose) {
                throw new BadRequestError(`Error en ${day}: El horario ${currentEnd} es después de la hora de cierre de la sucursal (${branchClose}).`);
            }

            // 3. Validar solapamiento con el siguiente bloque
            if (i < sorted.length - 1) {
                const next = sorted[i + 1];
                const nextStart = next.start_time.substring(0, 5);
                if (currentEnd > nextStart) {
                    throw new BadRequestError(`Error en ${day}: Los horarios se solapan. El bloque ${currentStart}-${currentEnd} invade el inicio de ${nextStart}.`);
                }
            }
        }
    }

    // Si pasamos las validaciones, procedemos a actualizar
    // Primero eliminamos los horarios existentes para este espacio
    await BusinessHourRepository.deleteBySpaceId(spaceId);

    // Preparamos los nuevos horarios con los datos de auditoría
    const newSchedules = schedulesData.map(schedule => ({
        ...schedule,
        space_id: spaceId,
        sucursal_id: space.sucursal_id,
        tenant_id: space.tenant_id,
        is_closed: schedule.is_closed !== undefined ? schedule.is_closed : false,
        ...buildAuditFields(userId)
    }));

    // Insertamos los nuevos horarios
    const result = await BusinessHourRepository.bulkCreate(newSchedules);

    return result;
};

/**
 * Activa o inactiva (cierra/abre) todos los horarios de un día específico
 */
const toggleDayStatus = async (spaceId, dayOfWeek, isClosed, userId, userContext = null) => {
    if (!spaceId || !dayOfWeek || isClosed === undefined) {
        throw new BadRequestError('ID de espacio, día y estado son requeridos');
    }

    const space = await SpaceRepository.findById(spaceId);
    if (!space) {
        throw new NotFoundError('El espacio deportivo no existe');
    }

    assertScope(space.sucursal_id, userContext);

    await BusinessHourRepository.updateIsClosedByDay(spaceId, dayOfWeek, isClosed, userId);
    
    // Retornamos los detalles completos del espacio actualizados
    return await SpaceRepository.findById(spaceId);
};

/**
 * Sube un archivo multimedia para un espacio (galería).
 * Usa MediaService centralizado → guarda en /uploads/spaces/img/ o /uploads/spaces/video/
 */
const uploadMedia = async (spaceId, file, description, userId, userContext = null) => {
    if (!spaceId) throw new BadRequestError('El ID del espacio es requerido');

    const space = await SpaceRepository.findById(spaceId);
    if (!space) throw new NotFoundError('El espacio deportivo no existe');

    assertScope(space.sucursal_id, userContext);

    return await MediaService.uploadMedia(
        file, spaceId, 'Space', 'GALLERY', space.tenant_id, userId, description || ''
    );
};

/**
 * Elimina un archivo multimedia de un espacio (físico + BD).
 */
const deleteMedia = async (mediaId, userContext = null) => {
    if (!mediaId) throw new BadRequestError('El ID del medio es requerido');
    return await MediaService.deleteMedia(mediaId);
};

/**
 * Marca un archivo multimedia como principal de un espacio.
 */
const setPrimaryMedia = async (mediaId, spaceId, userContext = null) => {
    if (!mediaId || !spaceId) throw new BadRequestError('ID de medio y de espacio son requeridos');
    return await MediaService.setPrimaryMedia(mediaId, spaceId, 'Space');
};

module.exports = {
    registerSpace,
    getSpaceDetails,
    getSpaceSchedules,
    getSpaceAvailability,
    updateSpace,
    createSchedules,
    toggleDayStatus,
    uploadMedia,
    deleteMedia,
    setPrimaryMedia
};
