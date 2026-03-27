/**
 * MediaService — Servicio centralizado de archivos multimedia
 *
 * Gestiona imágenes, videos y documentos para cualquier entidad del sistema
 * usando la tabla polimórfica dsg_bss_media.
 *
 * Entidades soportadas: Company, Space, User (y cualquier otra futura)
 */
const MediaRepository = require('../../facility/repository/MediaRepository');
const { buildFileUrl } = require('../../../shared/middlewares/uploadMiddleware');
const { NotFoundError, BadRequestError } = require('../../../shared/errors/CustomErrors');
const fs = require('fs');
const path = require('path');

// Raíz del proyecto para construir rutas absolutas de archivos físicos
const PROJECT_ROOT = path.join(__dirname, '../../../../../');

/**
 * Elimina el archivo físico del disco si existe.
 */
const deletePhysicalFile = (fileUrl) => {
    if (!fileUrl) return;
    try {
        const filePath = path.join(PROJECT_ROOT, fileUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
        console.warn('[MediaService] No se pudo eliminar archivo físico:', fileUrl, err.message);
    }
};

/**
 * Sube un archivo multimedia y crea el registro en la tabla Media.
 *
 * @param {object} file        - Objeto file de multer
 * @param {number} entityId    - ID de la entidad propietaria
 * @param {string} entityType  - 'Company' | 'Space' | 'User'
 * @param {string} category    - 'GALLERY' | 'PROFILE' | 'COVER' | 'THUMBNAIL' | 'DOCUMENT'
 * @param {string} tenantId
 * @param {number} userId
 * @param {string} [description]
 * @returns {object} Registro Media creado
 */
const uploadMedia = async (file, entityId, entityType, category = 'GALLERY', tenantId, userId, description = '') => {
    if (!file) throw new BadRequestError('No se proporcionó ningún archivo');

    const isImage    = file.mimetype.startsWith('image/');
    const isVideo    = file.mimetype.startsWith('video/');
    const fileType   = isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'DOCUMENT';
    const fileUrl    = buildFileUrl(file);

    return await MediaRepository.create({
        medible_id:  entityId,
        medible_type: entityType,
        tenant_id:   tenantId,
        type:        fileType,
        category,
        file_url:    fileUrl,
        file_name:   file.filename,
        description,
        is_primary:  false,
        user_create: userId,
        user_update: userId,
    });
};

/**
 * Reemplaza el archivo principal de una categoría:
 *  1. Elimina todos los archivos existentes de esa categoría (físico + BD)
 *  2. Sube el nuevo archivo y lo marca como primario
 *
 * Usado para logo, banner, yape_qr, plin_qr.
 *
 * @returns {object} Nuevo registro Media
 */
const replacePrimaryMedia = async (file, entityId, entityType, category, tenantId, userId) => {
    if (!file) return null;

    // Eliminar registros anteriores de esta categoría
    const existing = await MediaRepository.findAllByMedible(entityId, entityType, category);
    for (const m of existing) {
        deletePhysicalFile(m.file_url);
        await MediaRepository.remove(m.media_id);
    }

    const isImage  = file.mimetype.startsWith('image/');
    const isVideo  = file.mimetype.startsWith('video/');
    const fileType = isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'DOCUMENT';
    const fileUrl  = buildFileUrl(file);

    return await MediaRepository.create({
        medible_id:  entityId,
        medible_type: entityType,
        tenant_id:   tenantId,
        type:        fileType,
        category,
        file_url:    fileUrl,
        file_name:   file.filename,
        is_primary:  true,
        user_create: userId,
        user_update: userId,
    });
};

/**
 * Obtiene todos los archivos multimedia de una entidad.
 */
const getEntityMedia = async (entityId, entityType, category = null) => {
    return await MediaRepository.findAllByMedible(entityId, entityType, category);
};

/**
 * Obtiene el archivo principal de una entidad.
 */
const getPrimaryMedia = async (entityId, entityType) => {
    return await MediaRepository.findPrimaryByMedible(entityId, entityType);
};

/**
 * Elimina un archivo multimedia (físico + BD).
 */
const deleteMedia = async (mediaId) => {
    const media = await MediaRepository.findById(mediaId);
    if (!media) throw new NotFoundError('Archivo multimedia no encontrado');

    deletePhysicalFile(media.file_url);
    await MediaRepository.remove(mediaId);

    return { deleted: true, media_id: mediaId };
};

/**
 * Marca un archivo como el principal de su entidad.
 * Quita la marca de cualquier otro archivo de la misma entidad.
 */
const setPrimaryMedia = async (mediaId, entityId, entityType) => {
    const media = await MediaRepository.findById(mediaId);
    if (!media) throw new NotFoundError('Archivo multimedia no encontrado');

    if (String(media.medible_id) !== String(entityId) || media.medible_type !== entityType) {
        throw new BadRequestError('El archivo no pertenece a la entidad indicada');
    }

    await MediaRepository.unsetPrimaryByMedible(entityId, entityType);
    return await MediaRepository.update(mediaId, { is_primary: true });
};

module.exports = {
    uploadMedia,
    replacePrimaryMedia,
    getEntityMedia,
    getPrimaryMedia,
    deleteMedia,
    setPrimaryMedia,
    deletePhysicalFile, // Exportado para uso interno en otros servicios
};
