/**
 * DashboardService
 * Lógica de negocio para la página de inicio del panel administrativo.
 * Detecta el scope del usuario desde el JWT y retorna los datos correspondientes.
 */
const InicioRepository    = require('../repository/InicioRepository');
// Necesario para obtener currency_simbol de la sucursal en el scope subsidiary ──
const CompanyRepository   = require('../../facility/repository/CompanyRepository');

class InicioService {

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Calcula el rango de fechas para el mes/año seleccionado.
     * @param {number} month - 1-12
     * @param {number} year
     * @returns {{ startDate: Date, endDate: Date }}
     */
    _buildDateRange(month, year) {
        const startDate = new Date(year, month - 1, 1, 0, 0, 0);
        const endDate   = new Date(year, month, 0, 23, 59, 59); // último día del mes
        return { startDate, endDate };
    }

    /**
     * Detecta el scope de acceso del usuario a partir del payload del JWT.
     * @param {Object} user - req.user decodificado
     * @returns {'system'|'super_admin'|'subsidiary'}
     */
    _detectScope(user) {
        if (user.permissions?.includes('system.full_access'))                      return 'system';
        if (user.role === 'super_admin')    return 'super_admin';
        return 'subsidiary';
    }

    /**
     * Formatea el nombre completo del usuario desde el payload JWT.
     * @param {Object} user - req.user
     * @returns {string}
     */
    _getUserName(user) {
        if (user.first_name || user.last_name) {
            return `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
        return user.email || 'Administrador';
    }

    // ── Método principal ──────────────────────────────────────────────────────

    /**
     * Obtiene los datos de la página de inicio según el scope del usuario.
     * @param {Object} user     - req.user (payload JWT)
     * @param {number} month    - Mes seleccionado (1-12)
     * @param {number} year     - Año seleccionado
     */
    async getHomeData(user, month, year) {
        const scope              = this._detectScope(user);
        const { startDate, endDate } = this._buildDateRange(month, year);
        const greeting           = this._getUserName(user);

        if (scope === 'system') {
            return this._buildSystemResponse(greeting, startDate, endDate);
        }

        if (scope === 'super_admin') {
            return this._buildSuperAdminResponse(user, greeting, startDate, endDate);
        }

        // scope === 'subsidiary' (administrador / empleado)
        return this._buildSubsidiaryResponse(user, greeting, startDate, endDate);
    }

    // ── Builders por scope ────────────────────────────────────────────────────

    /**
     * Construye la respuesta para el scope de sistema (acceso global).
     */
    async _buildSystemResponse(greeting, startDate, endDate) {
        const [stats, recentActivity] = await Promise.all([
            InicioRepository.getSystemStats(startDate, endDate),
            InicioRepository.getSystemRecentActivity(12),
        ]);

        return {
            scope: 'system',
            greeting,
            stats,
            recentActivity: this._formatActivity(recentActivity),
            alerts: [],
        };
    }

    /**
     * Construye la respuesta para el scope de super_admin (tenant completo).
     */
    async _buildSuperAdminResponse(user, greeting, startDate, endDate) {
        const tenantId = user.tenant_id;

        // Si no tiene tenant_id, caer al scope de subsidiaria
        if (!tenantId) return this._buildSubsidiaryResponse(user, greeting, startDate, endDate);

        // Subsidiarias del tenant con sus mini-stats
        const subsidiaries = await InicioRepository.getSuperAdminSubsidiaries(tenantId, startDate, endDate);
        const subsidiaryIds = subsidiaries.map(s => Number(s.company_id));

        // Actividad reciente + alertas en paralelo (si hay subsidiarias)
        const [recentActivity, recentClients, alerts] = await Promise.all([
            subsidiaryIds.length ? InicioRepository.getRecentActivity(subsidiaryIds, 10) : [],
            subsidiaryIds.length ? InicioRepository.getRecentClients(subsidiaryIds, 8)   : [],
            subsidiaryIds.length ? InicioRepository.getSubsidiaryAlerts(subsidiaryIds)   : [],
        ]);

        // Totales agregados de las mini-stats de subsidiarias
        const totals = subsidiaries.reduce((acc, s) => ({
            totalBookings:    acc.totalBookings    + (s.stats.totalBookings    || 0),
            pendingApprovals: acc.pendingApprovals + (s.stats.pendingApprovals || 0),
        }), { totalBookings: 0, pendingApprovals: 0 });

        return {
            scope: 'super_admin',
            greeting,
            stats: {
                totalSubsidiaries: subsidiaries.length,
                ...totals,
            },
            subsidiaries,
            recentActivity: this._formatActivity(recentActivity),
            recentClients:  this._formatClients(recentClients),
            alerts,
        };
    }

    /**
     * Construye la respuesta para el scope de subsidiaria (admin / empleado).
     */
    async _buildSubsidiaryResponse(user, greeting, startDate, endDate) {
        // company_ids del JWT corresponden a las sucursales asignadas
        const subsidiaryIds = (user.company_ids || []).map(Number).filter(Boolean);

        if (!subsidiaryIds.length) {
            return {
                scope: 'subsidiary',
                greeting,
                stats: { todayBookings: 0, monthBookings: 0, pendingApprovals: 0, pendingPayments: 0, monthRevenue: 0 },
                recentActivity: [],
                recentClients:  [],
                alerts: [],
            };
        }

        const [stats, recentActivity, recentClients, alerts, sucursal] = await Promise.all([
            InicioRepository.getSubsidiaryStats(subsidiaryIds, startDate, endDate),
            InicioRepository.getRecentActivity(subsidiaryIds, 10),
            InicioRepository.getRecentClients(subsidiaryIds, 8),
            InicioRepository.getSubsidiaryAlerts(subsidiaryIds),
            // Cargar sucursal para obtener el símbolo de moneda del país ──────
            CompanyRepository.findById(subsidiaryIds[0]),
        ]);

        return {
            scope: 'subsidiary',
            greeting,
            stats,
            // Símbolo de moneda del país donde opera la sucursal — null si no hay país configurado
            currency_simbol: sucursal?.country?.currency_simbol ?? null,
            recentActivity: this._formatActivity(recentActivity),
            recentClients:  this._formatClients(recentClients),
            alerts,
        };
    }

    // ── Formatters ────────────────────────────────────────────────────────────

    /**
     * Normaliza los registros de actividad reciente para el frontend.
     * @param {Array} bookings - Array de instancias Booking con includes
     */
    _formatActivity(bookings) {
        return bookings.map(b => {
            // first_name y last_name están en User, phone en Person
            const u    = b.user;
            const name = (u?.first_name || u?.last_name)
                ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                : (u?.email || 'Cliente externo');

            return {
                booking_id:     b.booking_id,
                booking_date:   b.booking_date,
                start_time:     b.start_time,
                end_time:       b.end_time,
                status:         b.status,
                created_at:     b.created_at,
                user: {
                    user_id: u?.user_id || null,
                    name,
                    email:   u?.email || null,
                    phone:   u?.person?.phone || null,
                },
                space: {
                    space_id:   b.space?.space_id || null,
                    name:       b.space?.name     || '—',
                    subsidiary: b.space?.sucursal?.name || '—',
                    subsidiary_id: b.space?.sucursal?.company_id || null,
                },
                payment: b.payment
                    ? {
                        payment_id: b.payment.payment_id,
                        status:     b.payment.status,
                        amount:     parseFloat(b.payment.amount || 0),
                        method:     b.payment.method,
                    }
                    : null,
            };
        });
    }

    /**
     * Normaliza los registros de clientes recientes para el frontend.
     * @param {Array} users - Array de usuarios con person + last_booking
     */
    _formatClients(users) {
        // first_name/last_name están en User, phone en Person
        return users.map(u => ({
            user_id:      u.user_id,
            name:         (u.first_name || u.last_name)
                ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                : u.email,
            email:        u.email,
            phone:        u.person?.phone || null,
            last_booking: u.last_booking,
        }));
    }
}

module.exports = new InicioService();
