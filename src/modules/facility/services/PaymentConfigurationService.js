const PaymentConfigurationRepository = require('../repository/PaymentConfigurationRepository');
const PaymentAccountRepository = require('../repository/PaymentAccountRepository');
const MediaService = require('../../media/services/MediaService');
const CompanyRepository = require('../repository/CompanyRepository');
const { BadRequestError, NotFoundError } = require('../../../shared/errors/CustomErrors');
const sequelize = require('../../../config/db');

/**
 * Guarda y sincroniza los métodos de pago de una sucursal.
 * Al eliminar un tipo de pago, también elimina sus cuentas de pago asociadas (con QR).
 */
const saveActivePayments = async (sucursalId, paymentMethods, userId) => {
    if (!sucursalId) throw new BadRequestError('El ID de la sucursal es requerido');

    const sucursal = await CompanyRepository.findById(sucursalId);
    if (!sucursal) throw new NotFoundError('La sucursal no existe');

    const tenantId = sucursal.tenant_id;
    const transaction = await sequelize.transaction();

    try {
        const paymentTypeIds = paymentMethods.map(p => p.payment_type_id);

        // 1. Encontrar los tipos que se eliminarán para poder borrar sus cuentas de pago
        const currentConfigs = await PaymentConfigurationRepository.findBySucursalId(sucursalId);
        const removedTypeIds = currentConfigs
            .map(c => c.payment_type_id)
            .filter(id => !paymentTypeIds.includes(id));

        // 2. Eliminar cuentas de pago y sus archivos QR para los tipos removidos
        for (const typeId of removedTypeIds) {
            const accounts = await PaymentAccountRepository.findBySucursalAndType(sucursalId, typeId);
            for (const account of accounts) {
                const mediaList = await MediaService.getEntityMedia(account.payment_account_id, 'PaymentAccount', 'THUMBNAIL');
                for (const media of mediaList) {
                    await MediaService.deleteMedia(media.media_id);
                }
                await account.destroy();
            }
        }

        // 3. Eliminar los ConfigurationPayment que ya no están seleccionados
        await PaymentConfigurationRepository.deleteExcept(sucursalId, paymentTypeIds, transaction);

        // 4. Preparar datos para upsert
        const paymentsToSave = paymentMethods.map((p, index) => ({
            sucursal_id: sucursalId,
            payment_type_id: p.payment_type_id,
            tenant_id: tenantId,
            is_enabled: p.is_enabled ?? true,
            sort_order: p.sort_order ?? index,
            is_default: index === 0, // El primero por defecto según requerimiento
            user_create: userId,
            user_update: userId
        }));

        // 5. Guardar/Actualizar
        await PaymentConfigurationRepository.bulkUpsert(paymentsToSave, transaction);

        await transaction.commit();
        return await PaymentConfigurationRepository.findBySucursalId(sucursalId);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Actualiza solo el orden de los métodos de pago
 */
const updatePaymentOrder = async (sucursalId, orderedPayments, userId) => {
    const sucursal = await CompanyRepository.findById(sucursalId);
    if (!sucursal) throw new NotFoundError('La sucursal no existe');

    const transaction = await sequelize.transaction();

    try {
        const paymentsWithOrder = orderedPayments.map((p, index) => ({
            ...p,
            sort_order: index,
            is_default: index === 0, // El primero por defecto
            user_update: userId
        }));

        await PaymentConfigurationRepository.updateOrders(sucursalId, paymentsWithOrder, transaction);
        
        await transaction.commit();
        return await PaymentConfigurationRepository.findBySucursalId(sucursalId);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Obtiene los métodos de pago activos de una sucursal
 */
const getActivePaymentsBySucursal = async (sucursalId) => {
    if (!sucursalId) throw new BadRequestError('El ID de la sucursal es requerido');
    
    const activePayments = await PaymentConfigurationRepository.findActiveBySucursalId(sucursalId);
    
    // Mapear a un formato enriquecido con cuentas de pago para el frontend
    return activePayments.map(config => ({
        configuration_payment_id: config.configuration_payment_id,
        payment_type_id: config.payment_type.payment_type_id,
        name: config.payment_type.name,
        code: config.payment_type.code,
        category: config.payment_type.category,
        description: config.payment_type.description,
        icon_url: config.payment_type.icon_url,
        processing_time: config.payment_type.processing_time,
        commission_percentage: config.payment_type.commission_percentage,
        fixed_commission: config.payment_type.fixed_commission,
        is_default: config.is_default,
        sort_order: config.sort_order,
        payment_accounts: (config.paymentAccounts || [])
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(acc => ({
            payment_account_id: acc.payment_account_id,
            account_alias: acc.account_alias,
            account_number: acc.account_number,
            account_name: acc.account_name,
            qr_url: acc.qr_url,
            bank_name: acc.bank_name,
            bank_account_type: acc.bank_account_type,
            bank_account_cci: acc.bank_account_cci,
            bank_currency: acc.bank_currency,
            sort_order: acc.sort_order
        }))
    }));
};

module.exports = {
    saveActivePayments,
    getActivePaymentsBySucursal
};
