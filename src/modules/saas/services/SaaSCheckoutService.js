const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const sequelize = require('../../../config/db');

// Importar modelos locales de system y otros módulos
const { SaaSPlan, SaaSSubscription } = require('../../system/models');
const { Company } = require('../../facility/models');
const { User, Person, UserCompany, UserPermission } = require('../../users/models');
const { DEFAULT_PERMISSIONS } = require('../../system/constants/permissionsConstants');
const { PreApprovalPlan } = require('../../../config/mercadopago');
const { ConflictError, BadRequestError } = require('../../../shared/errors/CustomErrors');

const createCheckoutSession = async (payload) => {
    const {
        plan_id,
        billing_period,
        company_name,
        company_document,
        company_address,
        company_phone,
        country_id,
        ubigeo_id,
        first_name,
        last_name,
        email,
        password,
        owner_phone
    } = payload;

    // 1. Validaciones previas
    const plan = await SaaSPlan.findOne({ where: { plan_id, is_active: true } });
    if (!plan) {
        throw new BadRequestError('El plan seleccionado no existe o no está activo.');
    }

    // Validar correo único
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
        throw new ConflictError('Ya existe un usuario registrado con este correo electrónico.');
    }

    // Validar RUC/Documento único de empresa principal
    const companyExists = await Company.findOne({ 
        where: { 
            document: company_document,
            parent_company_id: null 
        } 
    });
    if (companyExists) {
        throw new ConflictError('Ya existe una empresa registrada con este número de documento.');
    }

    const tenantId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 2. Iniciar Transacción de BD
    const transaction = await sequelize.transaction();

    try {
        // Crear Usuario (owner) inactivo
        const newUser = await User.create({
            first_name,
            last_name,
            email,
            password: hashedPassword,
            role: 'super_admin',
            is_enabled: false
        }, { transaction });

        // Crear registro en Person si viene algún dato
        await Person.create({
            user_id: newUser.user_id,
            country_id: country_id,
            phone: owner_phone || company_phone,
            address: company_address
        }, { transaction });

        // Asignar permisos iniciales de super_admin
        const defaultPerms = DEFAULT_PERMISSIONS['super_admin'] || [];
        if (defaultPerms.length > 0) {
            await UserPermission.bulkCreate(
                defaultPerms.map(key => ({
                    user_id: newUser.user_id,
                    permission_key: key,
                    granted_by: newUser.user_id
                })),
                { ignoreDuplicates: true, transaction }
            );
        }

        // Crear Empresa principal en estado PENDING y vinculada al usuario
        const newCompany = await Company.create({
            name: company_name,
            address: company_address,
            document: company_document,
            phone_cell: company_phone,
            country_id,
            ubigeo_id,
            tenant_id: tenantId,
            parent_company_id: null,
            status: 'INACTIVE',
            is_enabled: 'P', // 'P' = Pending
            user_create: newUser.user_id,
            user_update: newUser.user_id
        }, { transaction });

        // Asociar usuario a la compañía
        await UserCompany.create({
            user_id: newUser.user_id,
            company_id: newCompany.company_id,
            role: 'super_admin',
            tenant_id: tenantId,
            is_active: true
        }, { transaction });

        // Crear la Suscripción en estado PENDING
        const subscription = await SaaSSubscription.create({
            company_id: newCompany.company_id,
            plan_id: plan.plan_id,
            status: 'PENDING',
            gateway: 'MERCADOPAGO'
        }, { transaction });

        // 3. Llamar a la API de MercadoPago para generar la Suscripción Recurrente (Preapproval)
        const price = billing_period === 'monthly' ? plan.price_monthly : plan.price_yearly;
        const frequency = billing_period === 'monthly' ? 1 : 12;
        const frequencyType = 'months'; // MercadoPago solo acepta 'days' o 'months' (no 'years')
        const frontAppUrl = process.env.FRONT_BOOKING_APP || 'http://localhost:3010';

        let mpResponse;
        try {
            const preapprovalPlan = new PreApprovalPlan(require('../../../config/mercadopago').client);
            mpResponse = await preapprovalPlan.create({
                body: {
                    reason: `Plan ${plan.name} (${billing_period === 'monthly' ? 'Mensual' : 'Anual'})`,
                    auto_recurring: {
                        frequency: frequency,
                        frequency_type: frequencyType,
                        transaction_amount: Number(price),
                        currency_id: 'PEN' // Soles peruanos por defecto
                    },
                    back_url: `${frontAppUrl}/checkout/success`,
                    external_reference: subscription.subscription_id.toString()
                }
            });
        } catch (mpError) {
            console.error('Error al llamar a la API de MercadoPago:', mpError);
            throw new Error('Hubo un error al conectar con la pasarela de pagos. Por favor, reintente en unos minutos.');
        }

        // Si MercadoPago responde sin init_point, lanzar error para hacer rollback
        if (!mpResponse || !mpResponse.init_point) {
            throw new Error('No se pudo generar la URL de pago de MercadoPago.');
        }

        // Actualizar suscripción con el ID de MercadoPago
        await subscription.update({
            mp_preapproval_id: mpResponse.id,
            mp_payer_email: email
        }, { transaction });

        // Commit de la transacción
        await transaction.commit();

        return {
            init_point: mpResponse.init_point,
            subscription_id: subscription.subscription_id
        };

    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

module.exports = {
    createCheckoutSession
};
