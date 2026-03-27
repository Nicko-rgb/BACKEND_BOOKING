/**
 * InicioRepository
 * Acceso a datos para la página de inicio del panel administrativo.
 * Soporta tres niveles de scope: sistema, super_admin y sucursal.
 */
const { Booking, PaymentBooking } = require('../../booking/models');
const { Company, Space, PaymentAccount, BusinessHour } = require('../../facility/models');
const { User, Person } = require('../../users/models');
const { Op, fn, col, literal } = require('sequelize');

class InicioRepository {

    // ── Helpers privados ─────────────────────────────────────────────────────

    /**
     * Devuelve la fecha de hoy en formato YYYY-MM-DD (zona local).
     */
    _today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * Devuelve los spaceIds que pertenecen a las sucursales indicadas.
     * @param {number[]} subsidiaryIds
     * @returns {Promise<number[]>}
     */
    async _getSpaceIds(subsidiaryIds) {
        if (!subsidiaryIds?.length) return [];
        const spaces = await Space.findAll({
            where: { sucursal_id: { [Op.in]: subsidiaryIds } },
            attributes: ['space_id'],
            raw: true,
        });
        return spaces.map(s => s.space_id);
    }

    // ── Include blocks reutilizables ─────────────────────────────────────────

    /** Include de usuario + persona para mostrar nombre y email del cliente.
     *  Nota: first_name y last_name están en User, no en Person. */
    _userInclude() {
        return {
            model: User,
            as: 'user',
            attributes: ['user_id', 'email', 'first_name', 'last_name'],
            include: [{
                model: Person,
                as: 'person',
                attributes: ['phone'],
            }],
        };
    }

    /** Include de espacio + sucursal para mostrar dónde ocurrió la reserva. */
    _spaceInclude(subsidiaryIds = null) {
        return {
            model: Space,
            as: 'space',
            attributes: ['space_id', 'name'],
            required: true,
            // Si se pasan subsidiaryIds, filtrar solo los espacios de esas sucursales
            ...(subsidiaryIds ? { where: { sucursal_id: { [Op.in]: subsidiaryIds } } } : {}),
            include: [{
                model: Company,
                as: 'sucursal',
                attributes: ['company_id', 'name'],
            }],
        };
    }

    // ── Datos por scope de sucursal (admin / empleado) ───────────────────────

    /**
     * Estadísticas de las sucursales asignadas al usuario.
     * @param {number[]} subsidiaryIds
     * @param {Date} startDate - Inicio del período (primer día del mes seleccionado)
     * @param {Date} endDate   - Fin del período (último día del mes seleccionado)
     */
    async getSubsidiaryStats(subsidiaryIds, startDate, endDate) {
        const spaceIds = await this._getSpaceIds(subsidiaryIds);
        const today    = this._today();

        // Fecha inicio/fin del período en formato DATEONLY
        const startStr = startDate.toISOString().split('T')[0];
        const endStr   = endDate.toISOString().split('T')[0];

        const spaceFilter = spaceIds.length ? { space_id: { [Op.in]: spaceIds } } : { space_id: -1 };

        // Reservas de hoy ─────────────────────────────────────────────────────
        const todayBookings = await Booking.count({
            where: { ...spaceFilter, booking_date: today },
        });

        // Reservas del período ─────────────────────────────────────────────────
        const monthBookings = await Booking.count({
            where: {
                ...spaceFilter,
                booking_date: { [Op.between]: [startStr, endStr] },
                status: { [Op.in]: ['CONFIRMED', 'PENDING', 'COMPLETED'] },
            },
        });

        // Pagos con aprobación pendiente (AWAITING_APPROVAL) en esas sucursales
        const pendingApprovals = await PaymentBooking.count({
            where: { status: 'AWAITING_APPROVAL' },
            include: [{
                model: Booking,
                as: 'bookings',
                attributes: [],
                required: true,
                where: spaceFilter,
            }],
            distinct: true,
            col: 'payment_id',
        });

        // Pagos pendientes de cobro (PENDING) ─────────────────────────────────
        const pendingPayments = await PaymentBooking.count({
            where: { status: 'PENDING' },
            include: [{
                model: Booking,
                as: 'bookings',
                attributes: [],
                required: true,
                where: spaceFilter,
            }],
            distinct: true,
            col: 'payment_id',
        });

        // Ingreso del período (pagos PAID en el rango) ─────────────────────────
        const paidPayments = await PaymentBooking.findAll({
            where: {
                status: 'PAID',
                payment_date: { [Op.between]: [startDate, endDate] },
            },
            include: [{
                model: Booking,
                as: 'bookings',
                attributes: [],
                required: true,
                where: spaceFilter,
            }],
            attributes: [
                [fn('COALESCE', fn('SUM', col('PaymentBooking.amount')), 0), 'total'],
            ],
            raw: true,
        });
        const monthRevenue = parseFloat(paidPayments[0]?.total || 0);

        return { todayBookings, monthBookings, pendingApprovals, pendingPayments, monthRevenue };
    }

    /**
     * Actividad reciente: últimas N reservas en las sucursales indicadas.
     * @param {number[]} subsidiaryIds
     * @param {number} limit
     */
    async getRecentActivity(subsidiaryIds, limit = 10) {
        return Booking.findAll({
            where: { status: { [Op.in]: ['CONFIRMED', 'PENDING', 'CANCELED', 'COMPLETED', 'NO_SHOW', 'REJECTED'] } },
            include: [
                this._spaceInclude(subsidiaryIds),
                this._userInclude(),
                {
                    model: PaymentBooking,
                    as: 'payment',
                    attributes: ['payment_id', 'status', 'amount', 'method'],
                },
            ],
            order: [['created_at', 'DESC']],
            limit,
        });
    }

    /**
     * Últimos clientes únicos que realizaron reservas en las sucursales.
     * @param {number[]} subsidiaryIds
     * @param {number} limit
     */
    async getRecentClients(subsidiaryIds, limit = 8) {
        const spaceIds = await this._getSpaceIds(subsidiaryIds);
        if (!spaceIds.length) return [];

        // Obtener los últimos user_ids distintos con su reserva más reciente
        const latestBookings = await Booking.findAll({
            where: {
                space_id: { [Op.in]: spaceIds },
                user_id: { [Op.ne]: null },
            },
            attributes: [
                'user_id',
                [fn('MAX', col('booking_date')), 'last_booking'],
            ],
            group: ['user_id'],
            order: [[literal('"last_booking"'), 'DESC']],
            limit,
            raw: true,
        });

        if (!latestBookings.length) return [];

        const userIds = latestBookings.map(b => b.user_id);

        // Traer datos de esos usuarios (first_name/last_name están en User, no en Person)
        const users = await User.findAll({
            where: { user_id: { [Op.in]: userIds } },
            attributes: ['user_id', 'email', 'first_name', 'last_name'],
            include: [{
                model: Person,
                as: 'person',
                attributes: ['phone'],
            }],
        });

        // Adjuntar la fecha de última reserva a cada usuario
        return users.map(u => {
            const booking = latestBookings.find(b => b.user_id === u.user_id);
            return { ...u.toJSON(), last_booking: booking?.last_booking || null };
        });
    }

    /**
     * Alertas de configuración para las sucursales indicadas.
     * Detecta: sin métodos de pago, sin espacios deportivos, sin horarios.
     * @param {number[]} subsidiaryIds
     */
    async getSubsidiaryAlerts(subsidiaryIds) {
        if (!subsidiaryIds?.length) return [];

        const [subsidiaries, spaces, paymentAccounts] = await Promise.all([
            // Info de cada sucursal
            Company.findAll({
                where: { company_id: { [Op.in]: subsidiaryIds } },
                attributes: ['company_id', 'name'],
            }),
            // Espacios por sucursal
            Space.findAll({
                where: { sucursal_id: { [Op.in]: subsidiaryIds } },
                attributes: ['space_id', 'sucursal_id'],
            }),
            // Cuentas de pago por sucursal
            PaymentAccount.findAll({
                where: { sucursal_id: { [Op.in]: subsidiaryIds } },
                attributes: ['payment_account_id', 'sucursal_id'],
            }),
        ]);

        // Espacios que tienen al menos un horario configurado
        // Consulta directa evitando alias inciertos en BusinessHour
        const spaceIdsInSubs = spaces.map(s => s.space_id);
        let spaceIdsWithHours = [];
        if (spaceIdsInSubs.length) {
            const bhRows = await BusinessHour.findAll({
                where: { space_id: { [Op.in]: spaceIdsInSubs } },
                attributes: ['space_id'],
                group: ['space_id'],
                raw: true,
            });
            spaceIdsWithHours = bhRows.map(r => r.space_id);
        }

        const alerts = [];

        // Agrupar por sucursal para comparar
        const spacesBySub   = new Set(spaces.map(s => Number(s.sucursal_id)));
        const paymentsBySub = new Set(paymentAccounts.map(p => Number(p.sucursal_id)));

        // sucursal_id de los espacios que sí tienen horarios
        const subsWithHours = new Set(
            spaces
                .filter(s => spaceIdsWithHours.includes(s.space_id))
                .map(s => Number(s.sucursal_id))
        );

        subsidiaries.forEach(sub => {
            const id   = Number(sub.company_id);
            const name = sub.name;

            // Sin cuentas de pago configuradas
            if (!paymentsBySub.has(id)) {
                alerts.push({
                    type: 'warning',
                    category: 'payment',
                    message: `"${name}" no tiene métodos de pago configurados`,
                    link: `/subsidiary/${id}`,
                });
            }
            // Sin espacios deportivos
            if (!spacesBySub.has(id)) {
                alerts.push({
                    type: 'danger',
                    category: 'spaces',
                    message: `"${name}" no tiene espacios deportivos registrados`,
                    link: `/subsidiary/${id}`,
                });
            }
            // Con espacios pero sin horarios
            if (spacesBySub.has(id) && !subsWithHours.has(id)) {
                alerts.push({
                    type: 'warning',
                    category: 'schedule',
                    message: `"${name}" tiene espacios sin horarios de atención`,
                    link: `/subsidiary/${id}`,
                });
            }
        });

        return alerts;
    }

    // ── Datos por scope de super_admin ───────────────────────────────────────

    /**
     * Lista de sucursales de un tenant con mini-estadísticas.
     * @param {string} tenantId
     * @param {Date} startDate
     * @param {Date} endDate
     */
    async getSuperAdminSubsidiaries(tenantId, startDate, endDate) {
        // Sucursales del tenant (empresas con parent_company_id, es decir, son hijas)
        const subsidiaries = await Company.findAll({
            where: {
                tenant_id: tenantId,
                parent_company_id: { [Op.ne]: null },
            },
            attributes: ['company_id', 'name', 'address', 'phone_cell'],
            order: [['name', 'ASC']],
        });

        if (!subsidiaries.length) return [];

        // Para cada sucursal obtener stats básicas en paralelo
        const results = await Promise.all(subsidiaries.map(async (sub) => {
            const subId    = Number(sub.company_id);
            const spaceIds = await this._getSpaceIds([subId]);
            const spaceFilter = spaceIds.length ? { space_id: { [Op.in]: spaceIds } } : { space_id: -1 };
            const startStr = startDate.toISOString().split('T')[0];
            const endStr   = endDate.toISOString().split('T')[0];

            const [totalBookings, pendingApprovals] = await Promise.all([
                Booking.count({
                    where: {
                        ...spaceFilter,
                        booking_date: { [Op.between]: [startStr, endStr] },
                        status: { [Op.in]: ['CONFIRMED', 'PENDING', 'COMPLETED'] },
                    },
                }),
                PaymentBooking.count({
                    where: { status: 'AWAITING_APPROVAL' },
                    include: [{
                        model: Booking,
                        as: 'bookings',
                        attributes: [],
                        required: true,
                        where: spaceFilter,
                    }],
                    distinct: true,
                    col: 'payment_id',
                }),
            ]);

            return {
                ...sub.toJSON(),
                stats: { totalBookings, pendingApprovals, totalSpaces: spaceIds.length },
            };
        }));

        return results;
    }

    // ── Datos por scope de sistema (system) ──────────────────────────────────

    /**
     * Estadísticas globales del sistema.
     * @param {Date} startDate
     * @param {Date} endDate
     */
    async getSystemStats(startDate, endDate) {
        const startStr = startDate.toISOString().split('T')[0];
        const endStr   = endDate.toISOString().split('T')[0];

        const [totalTenants, totalSubsidiaries, totalBookings, totalRevenue] = await Promise.all([
            // Empresas raíz (tenant: sin parent)
            Company.count({ where: { parent_company_id: null } }),
            // Sucursales (con parent)
            Company.count({ where: { parent_company_id: { [Op.ne]: null } } }),
            // Reservas del período
            Booking.count({
                where: {
                    booking_date: { [Op.between]: [startStr, endStr] },
                    status: { [Op.in]: ['CONFIRMED', 'PENDING', 'COMPLETED'] },
                },
            }),
            // Ingreso del período
            PaymentBooking.findAll({
                where: {
                    status: 'PAID',
                    payment_date: { [Op.between]: [startDate, endDate] },
                },
                attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
                raw: true,
            }),
        ]);

        return {
            totalTenants,
            totalSubsidiaries,
            totalBookings,
            totalRevenue: parseFloat(totalRevenue[0]?.total || 0),
        };
    }

    /**
     * Actividad reciente global (sin filtro de sucursal).
     * @param {number} limit
     */
    async getSystemRecentActivity(limit = 10) {
        return Booking.findAll({
            where: { status: { [Op.in]: ['CONFIRMED', 'PENDING', 'CANCELED', 'COMPLETED', 'NO_SHOW', 'REJECTED'] } },
            include: [
                this._spaceInclude(null),
                this._userInclude(),
                {
                    model: PaymentBooking,
                    as: 'payment',
                    attributes: ['payment_id', 'status', 'amount', 'method'],
                },
            ],
            order: [['created_at', 'DESC']],
            limit,
        });
    }
}

module.exports = new InicioRepository();
