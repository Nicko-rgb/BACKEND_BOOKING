const express = require('express');
const { validateDTO } = require('../../../shared/middlewares/validateDTO');
const { createSpaceDto, updateSpaceDto } = require('../dto/SpaceDto');
const { protegerPermiso, protegerPermisoConScope } = require('../../../shared/middlewares/proteger');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const upload = require('../../../shared/middlewares/uploadMiddleware');

const router = express.Router();
const {
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
} = require('../controllers/SpaceController');

/**
 * @route POST /api/spaces/register
 * @desc Registrar un nuevo espacio deportivo
 * @access system, super_admin, administrador — scope: sucursal_id en body
 */
router.post(
    '/register',
    ...protegerPermisoConScope('space.manage_own'),
    validateDTO(createSpaceDto),
    GlobalErrorHandler.asyncHandler(registerSpace)
);

/**
 * @route GET /api/spaces/details/:id
 * @desc Obtener detalles básicos de un espacio por ID
 * @access system, super_admin, administrador — scope: :id verifica vía sucursal_id en servicio
 */
router.get(
    '/details/:id',
    ...protegerPermiso('space.view'),
    GlobalErrorHandler.asyncHandler(getSpaceDetails)
);

/**
 * @route GET /api/spaces/details/:id/schedules
 * @desc Obtener solo los horarios de un espacio por ID
 * @access system, super_admin, administrador
 */
router.get(
    '/details/:id/schedules',
    ...protegerPermiso('space.view'),
    GlobalErrorHandler.asyncHandler(getSpaceSchedules)
);

/**
 * @route PUT /api/spaces/update/:id
 * @desc Actualizar un espacio deportivo
 * @access system, super_admin, administrador
 */
router.put(
    '/update/:id',
    ...protegerPermisoConScope('space.manage_own'),
    validateDTO(updateSpaceDto),
    GlobalErrorHandler.asyncHandler(updateSpace)
);

/**
 * @route POST /api/spaces/:id/schedules
 * @desc Crear o actualizar horarios de un espacio
 * @access system, super_admin, administrador
 */
router.post(
    '/:id/schedules',
    ...protegerPermisoConScope('business_hour.manage'),
    GlobalErrorHandler.asyncHandler(createSchedules)
);

/**
 * @route PATCH /api/spaces/:id/schedules/toggle-day
 * @desc Activar o desactivar horarios de un día específico
 * @access system, super_admin, administrador
 */
router.patch(
    '/:id/schedules/toggle-day',
    ...protegerPermisoConScope('business_hour.manage'),
    GlobalErrorHandler.asyncHandler(toggleDayStatus)
);

/**
 * @route POST /api/spaces/:id/media
 * @desc Subir archivo multimedia para un espacio
 * @access system, super_admin, administrador
 */
router.post(
    '/:id/media',
    ...protegerPermisoConScope('media.manage_facility'),
    upload.single('file'),
    GlobalErrorHandler.asyncHandler(uploadMedia)
);

/**
 * @route DELETE /api/spaces/media/:mediaId
 * @desc Eliminar un archivo multimedia
 * @access system, super_admin, administrador — el servicio valida ownership
 */
router.delete(
    '/media/:mediaId',
    ...protegerPermiso('media.manage_facility'),
    GlobalErrorHandler.asyncHandler(deleteMedia)
);

/**
 * @route PATCH /api/spaces/:id/media/:mediaId/primary
 * @desc Marcar un archivo multimedia como principal
 * @access system, super_admin, administrador
 */
router.patch(
    '/:id/media/:mediaId/primary',
    ...protegerPermisoConScope('media.manage_facility'),
    GlobalErrorHandler.asyncHandler(setPrimaryMedia)
);

/**
 * @route GET /api/spaces/:id/availability
 * @desc Obtener horarios disponibles agrupados por día — BOOKING SPORT
 * @access Public
 */
router.get(
    '/:id/availability',
    GlobalErrorHandler.asyncHandler(getSpaceAvailability)
);

module.exports = router;
