const SpaceHandler = require('../handlers/SpaceHandler');
const { extractUserContext } = require('../../../shared/utils/extractUserContext');

// Registra espacio deportivo
const registerSpace = async (req, res, next) => {
    const spaceData = req.validatedData || req.body;
    const userId = req.user?.user_id;
    const userContext = extractUserContext(req);
    await SpaceHandler.registerSpace(res, spaceData, userId, userContext);
};

// Obtiene datos de un espacio deportivo
const getSpaceDetails = async (req, res, next) => {
    const { id } = req.params;
    const userContext = extractUserContext(req);
    await SpaceHandler.getSpaceDetails(res, id, userContext);
};

// Obtiene solo los horarios de un espacio
const getSpaceSchedules = async (req, res, next) => {
    const { id } = req.params;
    const userContext = extractUserContext(req);
    await SpaceHandler.getSpaceSchedules(res, id, userContext);
};

// Obtiene disponibilidad y horarios agrupados (portal público)
const getSpaceAvailability = async (req, res, next) => {
    const { id } = req.params;
    await SpaceHandler.getSpaceAvailability(res, id);
};

// Actualiza un espacio deportivo
const updateSpace = async (req, res, next) => {
    const { id } = req.params;
    const updateData = req.validatedData || req.body;
    const userId = req.user?.user_id;
    const userContext = extractUserContext(req);
    await SpaceHandler.updateSpace(res, id, updateData, userId, userContext);
};

// Crea o actualiza horarios de un espacio
const createSchedules = async (req, res, next) => {
    const { id } = req.params;
    const { schedules } = req.body;
    const userId = req.user?.user_id;
    const userContext = extractUserContext(req);
    await SpaceHandler.createSchedules(res, id, schedules, userId, userContext);
};

// Activa o inactiva (cierra/abre) horarios por día
const toggleDayStatus = async (req, res, next) => {
    const { id } = req.params;
    const { day_of_week, is_closed } = req.body;
    const userId = req.user?.user_id;
    const userContext = extractUserContext(req);
    await SpaceHandler.toggleDayStatus(res, id, day_of_week, is_closed, userId, userContext);
};

// Sube un archivo multimedia para un espacio
const uploadMedia = async (req, res, next) => {
    const { id } = req.params;
    const { description } = req.body;
    const file = req.file;
    const userId = req.user?.user_id;
    const userContext = extractUserContext(req);
    await SpaceHandler.uploadMedia(res, id, description, file, userId, userContext);
};

// Elimina un archivo multimedia
const deleteMedia = async (req, res, next) => {
    const { mediaId } = req.params;
    const userContext = extractUserContext(req);
    await SpaceHandler.deleteMedia(res, mediaId, userContext);
};

// Marca un archivo multimedia como principal
const setPrimaryMedia = async (req, res, next) => {
    const { id, mediaId } = req.params;
    const userContext = extractUserContext(req);
    await SpaceHandler.setPrimaryMedia(res, id, mediaId, userContext);
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
