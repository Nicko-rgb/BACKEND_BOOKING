/**
 * ConfigurationService — Gestión de configuración para Compañías y Sucursales
 *
 * Maneja branding (logo, banner) y redes sociales.
 * Los datos de pago (Yape, Plin, cuentas bancarias) se gestionan en PaymentAccountService.
 */
const ConfigurationRepository = require('../repository/ConfigurationRepository');
const CompanyRepository        = require('../repository/CompanyRepository');
const MediaService             = require('../../media/services/MediaService');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/CustomErrors');
const cacheUtility = require('../../../shared/utils/cacheUtility');

// Whitelist de campos permitidos en Configuration
const ALLOWED_FIELDS = [
    'social_facebook', 'social_instagram', 'social_tiktok', 'social_youtube',
    'social_whatsapp', 'whatsapp_message',
];

/**
 * Obtener la configuración de una compañía o sucursal.
 */
const getConfiguration = async (companyId, publicView = false) => {
    if (!companyId) throw new BadRequestError('El ID de la compañía es requerido');

    const config = await ConfigurationRepository.findByCompanyId(companyId);
    if (!config) return null;

    const configObj = config.toJSON();

    // Buscar logo (PROFILE) y banner (COVER) en paralelo ─────────────────────
    const [profileList, coverList] = await Promise.all([
        MediaService.getEntityMedia(companyId, 'Company', 'PROFILE'),
        MediaService.getEntityMedia(companyId, 'Company', 'COVER'),
    ]);

    const profileMedia = profileList?.[0];
    const coverMedia   = coverList?.[0];

    if (profileMedia) {
        configObj.logo_url      = profileMedia.file_url;
        configObj.logo_media_id = profileMedia.media_id;
    }
    if (coverMedia) {
        configObj.banner_url      = coverMedia.file_url;
        configObj.banner_media_id = coverMedia.media_id;
    }

    return configObj;
};

/**
 * Guardar (crear o actualizar) la configuración de una compañía o sucursal.
 */
const saveConfiguration = async (companyId, configData, userId, files = {}) => {
    if (!companyId) throw new BadRequestError('El ID de la compañía es requerido');

    const company = await CompanyRepository.findById(companyId);
    if (!company) throw new NotFoundError('La compañía o sucursal especificada no existe');

    const tenantId = company.tenant_id;

    const finalConfigData = { tenant_id: tenantId };
    ALLOWED_FIELDS.forEach(field => {
        if (configData[field] !== undefined) {
            finalConfigData[field] = configData[field];
        }
    });

    // Logo → Media (PROFILE)
    if (files.logo && files.logo[0]) {
        await MediaService.replacePrimaryMedia(
            files.logo[0], companyId, 'Company', 'PROFILE', tenantId, userId
        );
    }

    // Banner → Media (COVER)
    if (files.banner && files.banner[0]) {
        await MediaService.replacePrimaryMedia(
            files.banner[0], companyId, 'Company', 'COVER', tenantId, userId
        );
    }

    const config = await ConfigurationRepository.upsert(companyId, finalConfigData, userId);

    await cacheUtility.del(cacheUtility.generateKey('company:details', { companyId }));

    return config;
};

/**
 * Eliminar el logo o banner de configuración.
 */
const deleteConfigMedia = async (companyId, mediaField) => {
    if (!companyId) throw new BadRequestError('El ID de la compañía es requerido');

    const FIELD_MAP = {
        logo:   { category: 'PROFILE' },
        banner: { category: 'COVER'   },
    };

    const mapping = FIELD_MAP[mediaField];
    if (!mapping) throw new BadRequestError(`Campo de imagen inválido: ${mediaField}. Use 'logo' o 'banner'`);

    const mediaRecord = await MediaService.getPrimaryMedia(companyId, 'Company');
    if (mediaRecord) {
        await MediaService.deleteMedia(mediaRecord.media_id);
    }

    return { deleted: !!mediaRecord, field: mediaField };
};

module.exports = {
    getConfiguration,
    saveConfiguration,
    deleteConfigMedia,
};
