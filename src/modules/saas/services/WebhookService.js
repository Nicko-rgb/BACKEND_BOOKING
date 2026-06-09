const sequelize = require('../../../config/db');
const { SaaSSubscription } = require('../../system/models');
const { Company } = require('../../facility/models');
const { User } = require('../../users/models');
const { PreApproval } = require('../../../config/mercadopago');
const { sendWelcomeSaaSClientEmail } = require('../../../shared/utils/mailer');

const handleWebhook = async (payload) => {
    // 1. Extraer datos básicos
    const { action, type, data } = payload;
    
    // Solo nos interesan los eventos sobre suscripciones recurrentes
    if (type !== 'subscription_preapproval' && type !== 'preapproval') {
        console.log(`[MP Webhook] Evento ignorado. Tipo: ${type}`);
        return { success: true, ignored: true };
    }

    const preapprovalId = data?.id;
    if (!preapprovalId) {
        console.warn('[MP Webhook] No se encontró el ID del preapproval en la data.');
        return { success: false, error: 'No data ID' };
    }

    console.log(`[MP Webhook] Procesando suscripción de MP: ${preapprovalId} (${action})`);

    // 2. Consultar el estado real de la suscripción en la API de MercadoPago (evitar fraudes)
    let mpData;
    try {
        const preapprovalClient = new PreApproval(require('../../../config/mercadopago').client);
        mpData = await preapprovalClient.get({ id: preapprovalId });
    } catch (mpError) {
        console.error(`[MP Webhook] Error al consultar preapproval ${preapprovalId} en MP:`, mpError);
        throw mpError; // Lanzamos error para que Express retorne 500 y MP reintente
    }

    if (!mpData) {
        console.warn(`[MP Webhook] No se encontró información en MP para el ID: ${preapprovalId}`);
        return { success: false, error: 'Not found in MercadoPago' };
    }

    const subscriptionId = mpData.external_reference;
    if (!subscriptionId) {
        console.warn(`[MP Webhook] El preapproval de MP no cuenta con external_reference (subscription_id): ${preapprovalId}`);
        return { success: true, ignored: true }; // Ignoramos si no es una creada por el SaaS
    }

    // 3. Buscar la suscripción en la BD
    const subscription = await SaaSSubscription.findByPk(subscriptionId, {
        include: [
            { model: Company, as: 'tenant' }
        ]
    });

    if (!subscription) {
        console.warn(`[MP Webhook] Suscripción no encontrada en base de datos. ID: ${subscriptionId}`);
        return { success: false, error: 'Subscription not found' };
    }

    const status = mpData.status; // 'pending', 'authorized', 'paused', 'cancelled'
    console.log(`[MP Webhook] Estado en MercadoPago para suscripción ${subscriptionId}: ${status}`);

    const transaction = await sequelize.transaction();

    try {
        if (status === 'authorized' || status === 'active') {
            // Activar la suscripción
            const now = new Date();
            const endDate = new Date();
            
            // Estimar duración basándonos en la frecuencia de cobro de MercadoPago
            const frequencyType = mpData.auto_recurring?.frequency_type;
            if (frequencyType === 'years') {
                endDate.setFullYear(now.getFullYear() + 1);
            } else {
                endDate.setMonth(now.getMonth() + 1); // Por defecto mensual
            }

            await subscription.update({
                status: 'ACTIVE',
                current_period_start: now,
                current_period_end: endDate
            }, { transaction });

            // Activar Compañía
            const company = await Company.findByPk(subscription.company_id);
            if (company) {
                await company.update({
                    status: 'ACTIVE',
                    is_enabled: 'A' // 'A' = Habilitada
                }, { transaction });

                // Activar Usuario(s) de tipo super_admin en esta compañía
                // Como es una empresa nueva, el user_create es el super_admin original
                if (company.user_create) {
                    const owner = await User.findByPk(company.user_create);
                    if (owner) {
                        await owner.update({ is_enabled: true }, { transaction });
                        
                        // Enviar email de bienvenida de forma asíncrona (no bloquea la transacción)
                        sendWelcomeSaaSClientEmail(owner.email, `${owner.first_name} ${owner.last_name}`, company.name)
                            .catch(err => console.error('[MP Webhook] Error al enviar correo de bienvenida:', err));
                    }
                }
            }

            console.log(`[MP Webhook] Suscripción ${subscriptionId} y compañía ${subscription.company_id} activadas correctamente.`);

        } else if (status === 'cancelled' || status === 'paused') {
            // Cancelar la suscripción en nuestra BD
            await subscription.update({
                status: status === 'cancelled' ? 'CANCELED' : 'PAST_DUE'
            }, { transaction });

            // Deshabilitar la compañía
            const company = await Company.findByPk(subscription.company_id);
            if (company) {
                await company.update({
                    is_enabled: 'I' // 'I' = Inactiva
                }, { transaction });

                // Deshabilitar el owner
                if (company.user_create) {
                    const owner = await User.findByPk(company.user_create);
                    if (owner) {
                        await owner.update({ is_enabled: false }, { transaction });
                    }
                }
            }
            console.log(`[MP Webhook] Suscripción ${subscriptionId} cancelada/pausada en BD.`);
        }

        await transaction.commit();
        return { success: true };

    } catch (error) {
        await transaction.rollback();
        console.error(`[MP Webhook] Error al aplicar cambios en BD para suscripción ${subscriptionId}:`, error);
        throw error;
    }
};

module.exports = {
    handleWebhook
};
