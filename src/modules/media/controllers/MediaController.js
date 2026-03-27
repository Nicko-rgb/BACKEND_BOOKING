/**
 * MediaController — CRUD de archivos multimedia
 *
 * Endpoints:
 *   POST   /api/media/upload/:entityType/:entityId   Subir archivo
 *   GET    /api/media/:entityType/:entityId          Listar archivos de una entidad
 *   DELETE /api/media/:mediaId                       Eliminar archivo
 *   PATCH  /api/media/:mediaId/primary               Marcar como principal
 */
const MediaService = require('../services/MediaService');
const ApiResponse  = require('../../../shared/utils/ApiResponse');

const MediaController = {

    /**
     * Subir un archivo multimedia para una entidad
     * Body (multipart): file (campo 'media'), description, category, tenant_id
     */
    async upload(req, res) {
        const { entityType, entityId } = req.params;
        const file     = req.file;
        const userId   = req.user?.user_id;
        const tenantId = req.user?.tenant_id || req.body.tenant_id;
        const category = req.body.category || 'GALLERY';
        const description = req.body.description || '';

        const media = await MediaService.uploadMedia(
            file, entityId, entityType, category, tenantId, userId, description
        );

        return res.status(201).json(
            ApiResponse.success(media, 'Archivo subido correctamente')
        );
    },

    /**
     * Listar todos los archivos de una entidad
     * Query: category (opcional)
     */
    async listByEntity(req, res) {
        const { entityType, entityId } = req.params;
        const { category } = req.query;

        const media = await MediaService.getEntityMedia(entityId, entityType, category || null);

        return res.json(
            ApiResponse.success(media, 'Archivos multimedia obtenidos')
        );
    },

    /**
     * Eliminar un archivo multimedia
     */
    async remove(req, res) {
        const { mediaId } = req.params;
        const result = await MediaService.deleteMedia(mediaId);
        return res.json(ApiResponse.success(result, 'Archivo eliminado correctamente'));
    },

    /**
     * Marcar un archivo como principal de su entidad
     */
    async setPrimary(req, res) {
        const { mediaId } = req.params;
        const { entityId, entityType } = req.body;

        const media = await MediaService.setPrimaryMedia(mediaId, entityId, entityType);
        return res.json(ApiResponse.success(media, 'Imagen principal actualizada'));
    },
};

module.exports = MediaController;
