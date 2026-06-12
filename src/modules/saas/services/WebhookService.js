const sequelize = require('../../../config/db');
const { SaaSSubscription } = require('../../system/models');
const { Company } = require('../../facility/models');
const { User } = require('../../users/models');
const { client: mpClient, Payment } = require('../../../config/mercadopago');
const { sendWelcomeSaaSClientEmail } = require('../../../shared/utils/mailer');

/** Calcula la fecha de fin del período (igual que en SaaSCheckoutService) */
const calcEndDate = (from, billingPeriod) => {
    const end = new Date(from);
    billingPeriod === 'yearly'
        ? end.setFullYear(end.getFullYear() + 1)
        : end.setMonth(end.getMonth() + 1);
    return end;
};

const handleWebhook = async (payload) => {
    const { type, data } = payload;

    // Solo procesamos eventos de pago único
    if (type !== 'payment') {
        console.log(`[MP Webhook] Evento ignorado. Tipo: ${type}`);
        return { success: true, ignored: true };
    }

    const paymentId = data?.id;
    if (!paymentId) {
        console.warn('[MP Webhook] No se encontró ID de pago en la data.');
        return { success: false, error: 'No data ID' };
    }

    console.log(`[MP Webhook] Procesando pago: ${paymentId}`);

    // Consultar el estado real del pago en MP para evitar fraudes ─────────────────────────
    let mpData;
    try {
        mpData = await new Payment(mpClient).get({ id: paymentId });
    } catch (mpError) {
        console.error(`[MP Webhook] Error al consultar pago ${paymentId}:`, mpError);
        throw mpError; // Relanzar para que MP reintente el webhook
    }

    // Solo nos interesa activar cuando el pago es aprobado ────────────────────────────────
    if (mpData.status !== 'approved') {
        console.log(`[MP Webhook] Pago ${paymentId} en estado "${mpData.status}". Ignorado.`);
        return { success: true, ignored: true };
    }

    // Buscar suscripción PENDING por external_reference ───────────────────────────────────
    // El checkout ya activa síncronamente si el pago se aprueba de inmediato.
    // Este webhook cubre el caso donde el pago quedó en 'pending' y luego se aprueba.
    const subscription = await SaaSSubscription.findOne({
        where: { subscription_id: mpData.external_reference, status: 'PENDING' }
    });

    if (!subscription) {
        console.log(`[MP Webhook] No hay suscripción PENDING para pago ${paymentId}. Posiblemente ya activada.`);
        return { success: true, ignored: true };
    }

    // Activar la cuenta ────────────────────────────────────────────────────────────────────
    const transaction = await sequelize.transaction();
    try {
        const now = new Date();
        await subscription.update({
            mp_payment_id:        String(paymentId),
            status:               'ACTIVE',
            current_period_start: now,
            current_period_end:   calcEndDate(now, subscription.billing_period || 'monthly')
        }, { transaction });

        const company = await Company.findByPk(subscription.company_id);
        if (company) {
            await company.update({ status: 'ACTIVE', is_enabled: 'A' }, { transaction });

            if (company.user_create) {
                const owner = await User.findByPk(company.user_create);
                if (owner) {
                    await owner.update({ is_enabled: true }, { transaction });

                    sendWelcomeSaaSClientEmail(owner.email, `${owner.first_name} ${owner.last_name}`, company.name)
                        .catch(err => console.error('[MP Webhook] Error al enviar correo de bienvenida:', err));
                }
            }
        }

        await transaction.commit();
        console.log(`[MP Webhook] Suscripción ${subscription.subscription_id} activada por webhook.`);
        return { success: true };

    } catch (error) {
        await transaction.rollback();
        console.error(`[MP Webhook] Error al activar suscripción ${subscription.subscription_id}:`, error);
        throw error;
    }
};

module.exports = { handleWebhook };
