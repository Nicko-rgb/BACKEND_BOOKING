/**
 * mediaRoutes — Endpoints para gestión centralizada de archivos multimedia
 *
 * POST   /api/media/upload/:entityType/:entityId   Subir archivo
 * GET    /api/media/:entityType/:entityId          Listar archivos de una entidad
 * DELETE /api/media/:mediaId                       Eliminar archivo
 * PATCH  /api/media/:mediaId/primary               Marcar como principal
 */
const express = require('express');
const router  = express.Router();

const upload             = require('../../../shared/middlewares/uploadMiddleware');
const { verificarTokenAuth } = require('../../../shared/middlewares/verificarTokenAuth');
const { verificarRol }   = require('../../../shared/middlewares/verificarRol');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const MediaController    = require('../controllers/MediaController');

const MEDIA_ROLES = ['system', 'super_admin', 'administrador'];

/**
 * @route  POST /api/media/upload/:entityType/:entityId
 * @desc   Sube un archivo y lo asocia a la entidad indicada.
 *         Body (multipart): campo 'media', description?, category?
 * @access Privado
 */
router.post(
    '/upload/:entityType/:entityId',
    verificarTokenAuth,
    verificarRol({ roles: MEDIA_ROLES }),
    upload.single('media'),
    GlobalErrorHandler.asyncHandler(MediaController.upload)
);

/**
 * @route  GET /api/media/:entityType/:entityId
 * @desc   Lista todos los archivos de una entidad.
 *         Query: category?
 * @access Privado
 */
router.get(
    '/:entityType/:entityId',
    verificarTokenAuth,
    verificarRol({ roles: MEDIA_ROLES }),
    GlobalErrorHandler.asyncHandler(MediaController.listByEntity)
);

/**
 * @route  DELETE /api/media/:mediaId
 * @desc   Elimina un archivo (físico + BD).
 * @access Privado
 */
router.delete(
    '/:mediaId',
    verificarTokenAuth,
    verificarRol({ roles: MEDIA_ROLES }),
    GlobalErrorHandler.asyncHandler(MediaController.remove)
);

/**
 * @route  PATCH /api/media/:mediaId/primary
 * @desc   Marca un archivo como imagen principal de su entidad.
 *         Body: { entityId, entityType }
 * @access Privado
 */
router.patch(
    '/:mediaId/primary',
    verificarTokenAuth,
    verificarRol({ roles: MEDIA_ROLES }),
    GlobalErrorHandler.asyncHandler(MediaController.setPrimary)
);

module.exports = router;
