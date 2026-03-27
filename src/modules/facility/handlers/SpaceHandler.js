const SpaceService = require('../services/SpaceService');
const { SpaceDto } = require('../dto/SpaceDto');
const ApiResponse = require('../../../shared/utils/ApiResponse');

// Registra un espacio deportivo
const registerSpace = async (res, spaceData, userId, userContext) => {
    const space = await SpaceService.registerSpace(spaceData, userId, userContext);
    const response = SpaceDto.toResponse(space);
    return ApiResponse.created(res, response, 'Espacio deportivo registrado');
};

// Obtiene detalles de espacio deportivo por ID
const getSpaceDetails = async (res, id, userContext) => {
    const space = await SpaceService.getSpaceDetails(id, userContext);
    const response = SpaceDto.toResponse(space);
    return ApiResponse.ok(res, response, 'Detalles: ' + space.name);
};

// Obtiene solo los horarios de un espacio
const getSpaceSchedules = async (res, id, userContext) => {
    const schedules = await SpaceService.getSpaceSchedules(id, userContext);
    return ApiResponse.ok(res, schedules, 'Horarios del espacio obtenidos');
};

// Obtiene la disponibilidad y horarios de un espacio - BOOKING SPORT (público)
const getSpaceAvailability = async (res, id) => {
    const availabilityData = await SpaceService.getSpaceAvailability(id);
    const response = SpaceDto.toAvailabilityResponse(availabilityData);
    return ApiResponse.ok(res, response, 'Disponibilidad de: ' + availabilityData.name);
};

// Actualiza datos de un espacio deportivo
const updateSpace = async (res, id, updateData, userId, userContext) => {
    const space = await SpaceService.updateSpace(id, updateData, userId, userContext);
    const response = SpaceDto.toResponse(space);
    return ApiResponse.ok(res, response, 'Espacio deportivo actualizado');
};

// Crea o actualiza horarios de un espacio
const createSchedules = async (res, id, schedules, userId, userContext) => {
    const result = await SpaceService.createSchedules(id, schedules, userId, userContext);
    return ApiResponse.ok(res, result, 'Horarios actualizados correctamente');
};

// Activa o inactiva (cierra/abre) horarios por día
const toggleDayStatus = async (res, id, day_of_week, is_closed, userId, userContext) => {
    const space = await SpaceService.toggleDayStatus(id, day_of_week, is_closed, userId, userContext);
    const response = SpaceDto.toResponse(space);
    return ApiResponse.ok(res, response, `Horarios del día ${day_of_week} actualizados`);
};

// Sube un archivo multimedia para un espacio
const uploadMedia = async (res, id, description, file, userId, userContext) => {
    if (!file) {
        return ApiResponse.error(null, res, 'FILE_REQUIRED', 'No se ha proporcionado ningún archivo', null, 400);
    }

    const media = await SpaceService.uploadMedia(id, file, description, userId, userContext);
    return ApiResponse.created(res, media, 'Archivo multimedia subido con éxito');
};

// Elimina un archivo multimedia
const deleteMedia = async (res, mediaId, userContext) => {
    await SpaceService.deleteMedia(mediaId, userContext);
    return ApiResponse.ok(res, null, 'Archivo multimedia eliminado');
};

// Marca un archivo multimedia como principal
const setPrimaryMedia = async (res, id, mediaId, userContext) => {
    const media = await SpaceService.setPrimaryMedia(mediaId, id, userContext);
    return ApiResponse.ok(res, media, 'Multimedia marcada como principal');
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
