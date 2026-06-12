const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const sequelize = require('../../../config/db');

const { SaaSPlan, SaaSSubscription } = require('../../system/models');
const { Company } = require('../../facility/models');
const { User, Person, UserCompany, UserPermission } = require('../../users/models');
const { DEFAULT_PERMISSIONS } = require('../../system/constants/permissionsConstants');
const { client: mpClient, Payment } = require('../../../config/mercadopago');
const { sendWelcomeSaaSClientEmail } = require('../../../shared/utils/mailer');
const { ConflictError, BadRequestError } = require('../../../shared/errors/CustomErrors');

/** Calcula la fecha de fin del período según el tipo de facturación */
const calcEndDate = (from, billingPeriod) => {
    const end = new Date(from);
    billingPeriod === 'yearly'
        ? end.setFullYear(end.getFullYear() + 1)
        : end.setMonth(end.getMonth() + 1);
    return end;
};

const createCheckoutSession = async (payload) => {
    const {
        plan_id, billing_period,
        company_name, company_document, company_address, company_phone,
        country_id, ubigeo_id,
        first_name, last_name, email, password, owner_phone,
        card_token_id, payment_method_id, installments
    } = payload;

    // 1. Validaciones previas ──────────────────────────────────────────────────────────────
    const plan = await SaaSPlan.findOne({ where: { plan_id, is_active: true } });
    if (!plan) throw new BadRequestError('El plan seleccionado no existe o no está activo.');

    if (await User.findOne({ where: { email } })) {
        throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
    }

    if (await Company.findOne({ where: { document: company_document, parent_company_id: null } })) {
        throw new ConflictError('Ya existe una empresa registrada con este número de documento.');
    }

    const planPrice      = billing_period === 'yearly' ? Number(plan.price_yearly) : Number(plan.price_monthly);
    const tenantId       = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Transacción de BD ─────────────────────────────────────────────────────────────────
    const transaction = await sequelize.transaction();

    try {
        const newUser = await User.create({
            first_name, last_name, email,
            password: hashedPassword,
            role: 'super_admin',
            is_enabled: false
        }, { transaction });

        await Person.create({
            user_id:    newUser.user_id,
            country_id,
            phone:      owner_phone || company_phone,
            address:    company_address
        }, { transaction });

        const defaultPerms = DEFAULT_PERMISSIONS['super_admin'] || [];
        if (defaultPerms.length > 0) {
            await UserPermission.bulkCreate(
                defaultPerms.map(key => ({
                    user_id:        newUser.user_id,
                    permission_key: key,
                    granted_by:     newUser.user_id
                })),
                { ignoreDuplicates: true, transaction }
            );
        }

        const newCompany = await Company.create({
            name:              company_name,
            address:           company_address,
            document:          company_document,
            phone_cell:        company_phone,
            country_id,
            ubigeo_id,
            tenant_id:         tenantId,
            parent_company_id: null,
            status:            'INACTIVE',
            is_enabled:        'P',
            user_create:       newUser.user_id,
            user_update:       newUser.user_id
        }, { transaction });

        await UserCompany.create({
            user_id:    newUser.user_id,
            company_id: newCompany.company_id,
            role:       'super_admin',
            tenant_id:  tenantId,
            is_active:  true
        }, { transaction });

        const subscription = await SaaSSubscription.create({
            company_id:     newCompany.company_id,
            plan_id:        plan.plan_id,
            billing_period,
            status:         'PENDING',
            gateway:        'MERCADOPAGO'
        }, { transaction });

        // 3. Cobrar con MercadoPago ────────────────────────────────────────────────────────
        const backendUrl = process.env.BACKEND_URL || 'https://api.redepor.com';

        let mpResponse;
        try {
            mpResponse = await new Payment(mpClient).create({
                body: {
                    transaction_amount: planPrice,
                    token:              card_token_id,
                    payment_method_id,
                    installments:       Number(installments) || 1,
                    description:        `${plan.name} — ${billing_period === 'yearly' ? 'Anual' : 'Mensual'}`,
                    payer:              { email },
                    external_reference: subscription.subscription_id.toString(),
                    notification_url:   `${backendUrl}/api/v1/saas-webhooks/webhook`
                }
            });
        } catch (mpError) {
            const cause   = mpError?.cause ?? mpError?.message ?? mpError;
            const message = Array.isArray(cause)
                ? cause.map(c => `[${c.code}] ${c.description}`).join(' | ')
                : String(cause);
            console.error(`[MP Payment] HTTP ${mpError?.status ?? 'N/A'} — ${message}`);
            throw new Error('Hubo un error al procesar el pago. Verifique los datos de su tarjeta e intente nuevamente.');
        }

        if (!mpResponse?.id) throw new Error('MercadoPago no devolvió una respuesta válida.');

        const mpStatus = mpResponse.status;
        console.log(`[MP Payment] ID ${mpResponse.id} — Estado: ${mpStatus}`);

        // Pago rechazado — no se activa la cuenta
        if (mpStatus === 'rejected') {
            const detail = mpResponse.status_detail || 'rejected';
            throw new Error(`El pago fue rechazado (${detail}). Verifique los datos de su tarjeta e intente nuevamente.`);
        }

        // Guardar referencia del pago ──────────────────────────────────────────────────────
        await subscription.update({ mp_payment_id: mpResponse.id, mp_payer_email: email }, { transaction });

        // 4. Activar inmediatamente si el pago fue aprobado ───────────────────────────────
        if (mpStatus === 'approved') {
            const now = new Date();
            await subscription.update({
                status:               'ACTIVE',
                current_period_start: now,
                current_period_end:   calcEndDate(now, billing_period)
            }, { transaction });

            await newCompany.update({ status: 'ACTIVE', is_enabled: 'A' }, { transaction });
            await newUser.update({ is_enabled: true }, { transaction });

            await transaction.commit();

            sendWelcomeSaaSClientEmail(email, `${first_name} ${last_name}`, company_name)
                .catch(err => console.error('[MP Payment] Error al enviar correo de bienvenida:', err));

        } else {
            // 'pending' — el webhook activará la cuenta cuando MP confirme el pago
            await transaction.commit();
        }

        return {
            subscription_id: subscription.subscription_id,
            mp_status:        mpStatus
        };

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = { createCheckoutSession };
