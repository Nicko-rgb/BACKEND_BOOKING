const PaymentAccountRepository       = require('../repository/PaymentAccountRepository');
const PaymentConfigurationRepository = require('../repository/PaymentConfigurationRepository');
const CompanyRepository              = require('../repository/CompanyRepository');
const MediaService                   = require('../../media/services/MediaService');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/CustomErrors');

const ALLOWED_FIELDS = [
    'account_alias', 'account_number', 'account_name', 'qr_url',
    'bank_name', 'bank_account_type', 'bank_account_cci', 'bank_currency',
    'sort_order', 'configuration_payment_id'
];

const toDto = (account) => ({
    payment_account_id: account.payment_account_id,
    sucursal_id: account.sucursal_id,
    payment_type_id: account.payment_type_id,
    configuration_payment_id: account.configuration_payment_id || null,
    payment_type_code: account.paymentType?.code || null,
    account_alias: account.account_alias,
    account_number: account.account_number,
    account_name: account.account_name,
    qr_url: account.qr_url,
    bank_name: account.bank_name,
    bank_account_type: account.bank_account_type,
    bank_account_cci: account.bank_account_cci,
    bank_currency: account.bank_currency,
    is_active: account.is_active,
    sort_order: account.sort_order
});

const getAccountsBySucursal = async (sucursalId) => {
    if (!sucursalId) throw new BadRequestError('El ID de la sucursal es requerido');
    const accounts = await PaymentAccountRepository.findBySucursal(sucursalId);
    return accounts.map(toDto);
};

const getAccountsByType = async (sucursalId, paymentTypeId) => {
    if (!sucursalId || !paymentTypeId) throw new BadRequestError('sucursal_id y payment_type_id son requeridos');
    const accounts = await PaymentAccountRepository.findBySucursalAndType(sucursalId, paymentTypeId);
    return accounts.map(toDto);
};

const createAccount = async (data, userId, files = {}) => {
    const { sucursal_id, payment_type_id } = data;
    if (!sucursal_id || !payment_type_id) throw new BadRequestError('sucursal_id y payment_type_id son requeridos');

    const sucursal = await CompanyRepository.findById(sucursal_id);
    if (!sucursal) throw new NotFoundError('La sucursal no existe');

    /**
     * Garantizar que exista un ConfigurationPayment para (sucursal, tipo) antes
     * de crear la cuenta. Sin este registro la cuenta quedaía huérfana y nunca
     * aparecería en el panel de métodos de pago (que carga cuentas vía el hasMany).
     * findOrCreate evita duplicados gracias al unique index (sucursal_id, payment_type_id).
     */
    let configurationPaymentId = data.configuration_payment_id
        ? Number(data.configuration_payment_id)
        : null;

    if (!configurationPaymentId) {
        const [config] = await PaymentConfigurationRepository.findOrCreateBySucursalAndType(
            sucursal_id,
            payment_type_id,
            {
                tenant_id:   sucursal.tenant_id,
                is_enabled:  true,
                sort_order:  0,
                is_default:  false,
                user_create: userId,
                user_update: userId,
            }
        );
        configurationPaymentId = config.configuration_payment_id;
    }

    const filteredData = {};
    ALLOWED_FIELDS.forEach(field => {
        if (data[field] !== undefined) filteredData[field] = data[field];
    });
    // Siempre usar el ID resuelto arriba, ignorar el que pudiera venir en filteredData
    filteredData.configuration_payment_id = configurationPaymentId;

    const account = await PaymentAccountRepository.create({
        sucursal_id,
        payment_type_id,
        tenant_id: sucursal.tenant_id,
        ...filteredData,
        user_create: userId,
        user_update: userId
    });

    // Subir QR si viene el archivo
    if (files.qr_image && files.qr_image[0]) {
        const media = await MediaService.uploadMedia(
            files.qr_image[0],
            account.payment_account_id,
            'PaymentAccount',
            'THUMBNAIL',
            sucursal.tenant_id,
            userId,
            `qr_payment_${account.payment_account_id}`
        );
        await PaymentAccountRepository.update(account.payment_account_id, { qr_url: media.file_url });
        account.qr_url = media.file_url;
    }

    return toDto(account);
};

const updateAccount = async (id, data, userId, files = {}) => {
    const account = await PaymentAccountRepository.findById(id);
    if (!account) throw new NotFoundError('Cuenta de pago no encontrada');

    const filteredData = {};
    ALLOWED_FIELDS.forEach(field => {
        if (data[field] !== undefined) filteredData[field] = data[field];
    });

    // Subir nuevo QR si viene
    if (files.qr_image && files.qr_image[0]) {
        // Buscar y reemplazar QR anterior en Media
        const existingMedia = await MediaService.getEntityMedia(id, 'PaymentAccount', 'THUMBNAIL');
        if (existingMedia && existingMedia.length > 0) {
            await MediaService.deleteMedia(existingMedia[0].media_id);
        }

        const sucursal = await CompanyRepository.findById(account.sucursal_id);
        const media = await MediaService.uploadMedia(
            files.qr_image[0],
            account.payment_account_id,
            'PaymentAccount',
            'THUMBNAIL',
            sucursal.tenant_id,
            userId,
            `qr_payment_${account.payment_account_id}`
        );
        filteredData.qr_url = media.file_url;
    }

    const updated = await PaymentAccountRepository.update(id, { ...filteredData, user_update: userId });
    return toDto(updated);
};

const deleteAccount = async (id) => {
    const account = await PaymentAccountRepository.findById(id);
    if (!account) throw new NotFoundError('Cuenta de pago no encontrada');

    // Eliminar imagen QR asociada (archivo físico + registro Media)
    const existingMedia = await MediaService.getEntityMedia(id, 'PaymentAccount', 'THUMBNAIL');
    for (const media of existingMedia) {
        await MediaService.deleteMedia(media.media_id);
    }

    await PaymentAccountRepository.hardDelete(id);
    return { deleted: true };
};

module.exports = { getAccountsBySucursal, getAccountsByType, createAccount, updateAccount, deleteAccount };
