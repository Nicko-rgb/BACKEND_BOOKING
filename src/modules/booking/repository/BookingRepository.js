const { Booking, PaymentBooking, BookingHold } = require('../models');
const { BusinessHour, Space } = require('../../facility/models');
const { User, Person } = require('../../users/models');
const { SportType } = require('../../catalogs/models');
const { Op } = require('sequelize');

class BookingRepository {
    /**
     * Verifica si existe solapamiento de horarios (reservas confirmadas y holds activos).
     *
     * Cuando se pasa una `transaction` activa se ejecuta con SELECT FOR UPDATE,
     * serializando la lectura y eliminando la ventana de race condition (TOCTOU).
     * Sin transacción (ej: consultas de disponibilidad desde el frontend) opera
     * en modo lectura normal para no bloquear innecesariamente.
     *
     * @param {string|number} excludeUserId - Excluye los holds de este usuario
     * @param {import('sequelize').Transaction|null} transaction - Transacción activa
     */
    async checkOverlap(space_id, date, start_time, end_time, excludeUserId = null, transaction = null) {
        // Opciones de bloqueo: solo aplican si se ejecuta dentro de una transacción
        const lockOpts = transaction
            ? { transaction, lock: transaction.LOCK.UPDATE }
            : {};

        // 1. Reservas activas: CONFIRMED o PENDING (CASH sin cobrar)
        //    Usamos findOne en lugar de count para soportar SELECT FOR UPDATE
        const bookingOverlap = await Booking.findOne({
            attributes: ['booking_id'],
            where: {
                space_id,
                booking_date: date,
                status: { [Op.in]: ['CONFIRMED', 'PENDING'] },
                [Op.and]: [
                    { start_time: { [Op.lt]: end_time } },
                    { end_time: { [Op.gt]: start_time } }
                ]
            },
            ...lockOpts
        });

        if (bookingOverlap) return true;

        // 2. Holds activos (excluyendo al propio usuario si se indica)
        const holdWhereClause = {
            space_id,
            booking_date: date,
            status: 'ACTIVE',
            expires_at: { [Op.gt]: new Date() },
            [Op.and]: [
                { start_time: { [Op.lt]: end_time } },
                { end_time: { [Op.gt]: start_time } }
            ]
        };

        if (excludeUserId !== null) {
            holdWhereClause.user_id = { [Op.ne]: excludeUserId };
        }

        const holdOverlap = await BookingHold.findOne({
            attributes: ['hold_id'],
            where: holdWhereClause,
            ...lockOpts
        });

        return !!holdOverlap;
    }

    /**
     * Busca los horarios de negocio de un espacio para un día de la semana
     */
    async findBusinessHoursByDay(space_id, day_of_week) {
        return await BusinessHour.findAll({
            where: { space_id, day_of_week }
        });
    }

    /**
     * Busca reservas confirmadas + holds activos por espacio y fecha
     */
    async findBySpaceAndDate(space_id, date) {
        // Reservas CONFIRMED → slot ocupado (tipo: 'reserved')
        // Reservas PENDING (CASH sin cobrar) → slot bloqueado temporalmente (tipo: 'pending_payment')
        // Ambos son visibles en el timeline para que nadie más pueda reservarlos
        const bookings = await Booking.findAll({
            where: {
                space_id,
                booking_date: date,
                status: { [Op.in]: ['CONFIRMED', 'PENDING'] }
            },
            include: [
                { 
                    association: 'payment', 
                    attributes: [
                        'payment_id', 'status', 'amount', 'method', 'payment_proof_url',
                        'payment_proof_number', 'transaction_id', 'payment_gateway',
                        'scheduled_payment_date', 'scheduled_payment_time', 'contact_phone',
                        'payment_date', 'cash_received_at'
                    ],
                    include: [{ association: 'bookings', attributes: ['booking_id', 'booking_date', 'start_time', 'end_time', 'total_amount', 'status'] }]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_id', 'first_name', 'last_name', 'email'],
                    include: [
                        {
                            model: Person,
                            as: 'person',
                            attributes: ['phone']
                        }
                    ]
                }
            ]
        });

        const holds = await BookingHold.findAll({
            where: {
                space_id,
                booking_date: date,
                status: 'ACTIVE',
                expires_at: { [Op.gt]: new Date() }
            }
        });

        return [
            ...bookings.map(b => {
                let type = 'pending_payment';
                if (b.status === 'CONFIRMED') type = 'reserved';
                else if (b.status === 'PENDING' && b.payment?.status === 'AWAITING_APPROVAL') type = 'awaiting_approval';
                
                return {
                    ...b.toJSON(),
                    type
                };
            }),
            ...holds.map(h => ({
                booking_id: `hold-${h.hold_id}`,
                hold_id: h.hold_id,
                user_id: h.user_id,
                start_time: h.start_time,
                end_time: h.end_time,
                status: 'PENDING',
                type: 'reserving',
                expires_at: h.expires_at,
                extension_count: h.extension_count,
                extension_limit: h.extension_limit
            }))
        ];
    }

    /**
     * Busca reservas confirmadas + holds activos por espacio y rango de fechas
     */
    async findBySpaceAndDateRange(space_id, start_date, end_date) {
        const bookings = await Booking.findAll({
            where: {
                space_id,
                booking_date: {
                    [Op.between]: [start_date, end_date]
                },
                status: { [Op.in]: ['CONFIRMED', 'PENDING'] }
            },
            include: [
                { 
                    association: 'payment', 
                    attributes: [
                        'payment_id', 'status', 'amount', 'method', 'payment_proof_url',
                        'payment_proof_number', 'transaction_id', 'payment_gateway',
                        'scheduled_payment_date', 'scheduled_payment_time', 'contact_phone',
                        'payment_date', 'cash_received_at'
                    ],
                    include: [{ association: 'bookings', attributes: ['booking_id', 'booking_date', 'start_time', 'end_time', 'total_amount', 'status'] }]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_id', 'first_name', 'last_name', 'email'],
                    include: [
                        {
                            model: Person,
                            as: 'person',
                            attributes: ['phone']
                        }
                    ]
                }
            ]
        });

        const holds = await BookingHold.findAll({
            where: {
                space_id,
                booking_date: {
                    [Op.between]: [start_date, end_date]
                },
                status: 'ACTIVE',
                expires_at: { [Op.gt]: new Date() }
            }
        });

        return [
            ...bookings.map(b => {
                let type = 'pending_payment';
                if (b.status === 'CONFIRMED') type = 'reserved';
                else if (b.status === 'PENDING' && b.payment?.status === 'AWAITING_APPROVAL') type = 'awaiting_approval';
                
                return {
                    ...b.toJSON(),
                    type
                };
            }),
            ...holds.map(h => ({
                booking_id: `hold-${h.hold_id}`,
                hold_id: h.hold_id,
                user_id: h.user_id,
                start_time: h.start_time,
                end_time: h.end_time,
                booking_date: h.booking_date,
                status: 'PENDING',
                type: 'reserving',
                expires_at: h.expires_at
            }))
        ];
    }

    /**
     * Crea un bloqueo temporal (Hold) por 5 minutos
     */
    async createHold(holdData, transaction = null) {
        return await BookingHold.create({
            ...holdData,
            status: 'ACTIVE',
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
            extension_count: 0,
            extension_limit: 1
        }, { transaction });
    }

    /**
     * Extiende la expiración de todos los holds activos de un usuario en un espacio
     */
    async extendUserHolds(user_id, space_id, newExpiration, transaction = null) {
        return await BookingHold.update(
            { expires_at: newExpiration },
            { where: { user_id, space_id, status: 'ACTIVE' }, transaction }
        );
    }

    /**
     * Retorna los holds activos de un usuario y los elimina físicamente (hard delete)
     * También es usado por el job de expiración para obtener la lista antes de borrar
     */
    async getAndDeleteUserHolds(user_id) {
        const activeHolds = await BookingHold.findAll({
            where: { user_id, status: 'ACTIVE' }
        });

        if (activeHolds.length > 0) {
            await BookingHold.destroy({ where: { user_id } });
        }

        return activeHolds;
    }

    /**
     * Busca todos los holds de un usuario por espacio y fecha
     */
    async findHoldsByUserDate(user_id, space_id, booking_date) {
        return await BookingHold.findAll({
            where: { user_id, space_id, booking_date, status: 'ACTIVE' }
        });
    }

    /**
     * Elimina todos los holds de un usuario por espacio y fecha
     */
    async deleteUserHoldsByDate(user_id, space_id, booking_date) {
        return await BookingHold.destroy({
            where: { user_id, space_id, booking_date }
        });
    }

    /**
     * Busca un hold por ID
     */
    async findHoldById(holdId) {
        return await BookingHold.findByPk(holdId);
    }

    /**
     * Elimina FÍSICAMENTE un hold por su ID (hard delete individual)
     */
    async deleteHoldById(holdId) {
        return await BookingHold.destroy({ where: { hold_id: holdId } });
    }

    /**
     * Encuentra holds activos que ya expiraron (para el job de limpieza)
     */
    async findAndDeleteExpiredHolds() {
        const expiredHolds = await BookingHold.findAll({
            where: {
                status: 'ACTIVE',
                expires_at: { [Op.lt]: new Date() }
            }
        });

        if (expiredHolds.length > 0) {
            const ids = expiredHolds.map(h => h.hold_id);
            await BookingHold.destroy({ where: { hold_id: ids } });
        }

        return expiredHolds;
    }

    /**
     * Retorna el hold activo que expira más pronto (para el timer dinámico del job)
     */
    async findNextExpiringHold() {
        return await BookingHold.findOne({
            where: {
                status: 'ACTIVE',
                expires_at: { [Op.gt]: new Date() }
            },
            order: [['expires_at', 'ASC']]
        });
    }


    /**
     * Extiende un bloqueo temporal (+N minutos)
     */
    async extendHold(holdId, minutes, transaction = null) {
        const hold = await BookingHold.findByPk(holdId);
        if (!hold) throw new Error('Bloqueo no encontrado');

        const newExpiration = new Date(hold.expires_at.getTime() + minutes * 60 * 1000);

        return await BookingHold.update({
            expires_at: newExpiration,
            extension_count: hold.extension_count + 1
        }, {
            where: { hold_id: holdId },
            transaction
        });
    }

    /**
     * Crea una nueva reserva definitiva
     */
    async create(bookingData, transaction = null) {
        return await Booking.create(bookingData, { transaction });
    }

    /**
     * Crea un registro de pago
     */
    async createPayment(paymentData, transaction = null) {
        return await PaymentBooking.create(paymentData, { transaction });
    }

    /**
     * Vincula un arreglo de IDs de reservas con un ID de pago
     */
    async updateBookingsPaymentId(bookingIds, paymentId, transaction = null) {
        return await Booking.update(
            { payment_id: paymentId },
            { 
                where: { booking_id: bookingIds },
                transaction 
            }
        );
    }

    /**
     * Busca una reserva por ID con sus relaciones
     */
    async findById(bookingId) {
        return await Booking.findByPk(bookingId, {
            include: [
                { association: 'payment', include: ['payment_type'] },
                { association: 'space' },
                { association: 'user' }
            ]
        });
    }

    /**
     * Busca una reserva por ID con todas las relaciones enriquecidas para el recibo,
     * incluyendo sucursal y tipo de deporte.
     */
    async findByIdForReceipt(bookingId) {
        const booking = await Booking.findByPk(bookingId);
        if (!booking || !booking.payment_id) return null;

        return await PaymentBooking.findOne({
            where: { payment_id: booking.payment_id },
            include: [
                { association: 'payment_type' },
                {
                    association: 'bookings',
                    include: [
                        {
                            association: 'space',
                            include: [
                                {
                                    // Incluir país de la sucursal para obtener moneda del recibo ─
                                    association: 'sucursal',
                                    include: [{ association: 'country', attributes: ['currency_simbol', 'iso_currency'] }]
                                },
                                { association: 'sportType' }
                            ]
                        },
                        { association: 'user' }
                    ]
                }
            ]
        });
    }

    /**
     * Aprueba una reserva presencial (Admin)
     */
    async approveBooking(bookingId, adminId, transaction = null) {
        return await Booking.update({
            status: 'CONFIRMED',
            approved_by: adminId,
            approved_at: new Date(),
            confirmed_at: new Date()
        }, {
            where: { booking_id: bookingId },
            transaction
        });
    }
    /**
     * Actualiza los datos de un pago existente (usado al confirmar cobro en efectivo)
     */
    async updatePayment(bookingId, fields, transaction = null) {
        const booking = await Booking.findByPk(bookingId, { transaction });
        if (!booking || !booking.payment_id) return null;

        return await PaymentBooking.update(fields, {
            where: { payment_id: booking.payment_id },
            transaction
        });
    }

    /**
     * Recalcula el monto total del pago basándose solo en las reservas activas
     * (CONFIRMED y PENDING), excluyendo REJECTED y CANCELED.
     */
    async recalculatePaymentAmount(paymentId, transaction = null) {
        const bookings = await Booking.findAll({
            where: {
                payment_id: paymentId,
                status: { [Op.in]: ['CONFIRMED', 'PENDING'] }
            },
            attributes: ['total_amount'],
            transaction
        });

        const newTotal = bookings.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

        return await PaymentBooking.update({
            amount: newTotal
        }, {
            where: { payment_id: paymentId },
            transaction
        });
    }

    /**
     * Actualiza el estado de un pago directamente por su ID de pago
     */
    async updatePaymentStatusById(paymentId, fields, transaction = null) {
        return await PaymentBooking.update(fields, {
            where: { payment_id: paymentId },
            transaction
        });
    }

    /**
     * Cuenta cuántas reservas asociadas a un pago NO están en estado CONFIRMED, CANCELED o REJECTED
     * (Es decir, cuántas siguen PENDING)
     */
    async countPendingBookings(paymentId, transaction = null) {
        return await Booking.count({
            where: {
                payment_id: paymentId,
                status: 'PENDING'
            },
            transaction
        });
    }

    /**
     * Cuenta cuántas reservas de un pago NO han sido rechazadas ni canceladas
     * (Es decir, cuántas son CONFIRMED o PENDING)
     */
    async countActiveBookingsInPayment(paymentId, transaction = null) {
        return await Booking.count({
            where: {
                payment_id: paymentId,
                status: { [Op.in]: ['CONFIRMED', 'PENDING'] }
            },
            transaction
        });
    }

    /**
     * Actualiza la URL del comprobante de pago en PaymentBooking
     * y cambia el estado a AWAITING_APPROVAL para que el administrador lo valide
     */
    // Guarda la URL del comprobante y el número de operación, y cambia el estado a AWAITING_APPROVAL
    async updatePaymentProofUrl(bookingId, proofUrl, proofNumber = null) {
        const booking = await Booking.findByPk(bookingId);
        if (!booking || !booking.payment_id) return null;

        return await PaymentBooking.update(
            {
                payment_proof_url: proofUrl,
                ...(proofNumber ? { payment_proof_number: proofNumber } : {}),
                status: 'AWAITING_APPROVAL'
            },
            { where: { payment_id: booking.payment_id } }
        );
    }

    /**
     * Cancela una reserva iniciada por el cliente.
     */
    async cancelBooking(bookingId, { cancellation_reason, adminId }, transaction = null) {
        await Booking.update({
            status: 'CANCELED',
            cancellation_reason: cancellation_reason || 'Cancelada por el cliente'
        }, {
            where: { booking_id: bookingId },
            transaction
        });
    }

    /**
     * Rechaza una reserva desde la administración.
     * Si no se especifica administrador, se asume el sistema.
     */
    async rejectBooking(bookingId, { rejection_reason, adminId }, transaction = null) {
        await Booking.update({
            status: 'REJECTED',
            cancellation_reason: rejection_reason || 'Rechazada por la administración',
            approved_by: adminId || null
        }, {
            where: { booking_id: bookingId },
            transaction
        });
    }

    /**
     * Actualiza el estado de un registro de pago a FAILED
     */
    async failPayment(paymentId, transaction = null) {
        return await PaymentBooking.update({
            status: 'FAILED',
            payment_date: new Date()
        }, {
            where: { payment_id: paymentId },
            transaction
        });
    }

    /**
     * Cancela el pago asociado a una reserva.
     */
    async cancelPaymentByBookingId(bookingId, adminId, transaction = null) {
        const booking = await Booking.findByPk(bookingId, { transaction });
        if (booking && booking.payment_id) {
            await PaymentBooking.update({
                status: 'CANCELED',
                user_update: adminId || null
            }, {
                where: { payment_id: booking.payment_id },
                transaction
            });
        }
    }

    /**
     * Devuelve todas las reservas pendientes de confirmación de pago (panel Admin).
     * Incluye métodos IN_PERSON (CASH) y ONLINE manuales (YAPE, PLIN, BANK_TRANSFER).
     */
    /**
     * Devuelve todas las reservas de una sucursal con paginación.
     * Filtra a través de Space.sucursal_id. Incluye espacio, usuario y pago.
     * @param {number} sucursalId
     * @param {object} opts - { page, limit, status }
     */
    async findBySubsidiary(sucursalId, { page = 1, limit = 20, status = null, startDate = null, endDate = null } = {}) {
        // Paso 1: obtener los space_ids que pertenecen a la sucursal
        const spaces = await Space.findAll({
            where: { sucursal_id: sucursalId },
            attributes: ['space_id'],
        });
        const spaceIds = spaces.map(s => s.space_id);

        if (spaceIds.length === 0) {
            return { bookings: [], total: 0, page, limit, totalPages: 0 };
        }

        // Paso 2: construir filtro de bookings con esos space_ids
        const bookingWhere = { space_id: { [Op.in]: spaceIds } };
        if (status) bookingWhere.status = status;
        if (startDate && endDate) {
            bookingWhere.booking_date = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            bookingWhere.booking_date = { [Op.gte]: startDate };
        } else if (endDate) {
            bookingWhere.booking_date = { [Op.lte]: endDate };
        }

        const { fn, col, literal } = Booking.sequelize;

        // Paso 3: agregados financieros (sobre todos los registros del período, sin paginación)
        const [paidRow] = await Booking.findAll({
            where: bookingWhere,
            include: [{
                association: 'payment',
                where: { status: 'PAID' },
                required: true,
                attributes: [],
            }],
            attributes: [[fn('COALESCE', fn('SUM', col('Booking.total_amount')), literal('0')), 'sum']],
            raw: true,
        });

        const [pendingRow] = await Booking.findAll({
            where: {
                ...bookingWhere,
                status: { [Op.in]: ['CONFIRMED', 'PENDING'] },
            },
            include: [{
                association: 'payment',
                where: { status: { [Op.notIn]: ['PAID', 'CANCELED', 'FAILED'] } },
                required: false,
                attributes: [],
            }],
            attributes: [[fn('COALESCE', fn('SUM', col('Booking.total_amount')), literal('0')), 'sum']],
            raw: true,
        });

        // Paso 4: paginación y lista
        const offset = (page - 1) * limit;

        const { count, rows } = await Booking.findAndCountAll({
            where: bookingWhere,
            include: [
                {
                    model: Space,
                    as: 'space',
                    attributes: ['space_id', 'name'],
                    include: [{ association: 'sportType', attributes: ['name'] }],
                },
                {
                    association: 'payment',
                    attributes: [
                        'payment_id', 'status', 'amount', 'method', 'payment_proof_url',
                        'transaction_id', 'payment_gateway',
                        'scheduled_payment_date', 'scheduled_payment_time', 'contact_phone'
                    ],
                    include: [{ association: 'bookings', attributes: ['booking_id', 'booking_date', 'start_time', 'end_time', 'total_amount', 'status'] }]
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['user_id', 'first_name', 'last_name', 'email'],
                    include: [{ model: Person, as: 'person', attributes: ['phone'] }]
                }
            ],
            order: [['booking_date', 'DESC'], ['start_time', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        return {
            bookings: rows.map(b => b.toJSON()),
            total: count,
            totalPaid: parseFloat(paidRow?.sum || 0),
            totalPending: parseFloat(pendingRow?.sum || 0),
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        };
    }

    /**
     * Lista los pagos de una sucursal con sus reservas incluidas.
     * Filtra por los space_ids de la sucursal y el rango de fechas de las reservas.
     */
    async findPaymentsBySubsidiary(sucursalId, { page = 1, limit = 20, status = null, startDate = null, endDate = null } = {}) {
        // Paso 1: space_ids de la sucursal
        const spaces = await Space.findAll({
            where: { sucursal_id: sucursalId },
            attributes: ['space_id'],
        });
        const spaceIds = spaces.map(s => s.space_id);

        if (spaceIds.length === 0) {
            return { payments: [], total: 0, totalPaid: 0, totalPending: 0, page, limit, totalPages: 0 };
        }

        // Paso 2: payment_ids que tienen al menos una reserva en la sucursal y período
        const bookingFilter = { space_id: { [Op.in]: spaceIds } };
        if (startDate && endDate) {
            bookingFilter.booking_date = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            bookingFilter.booking_date = { [Op.gte]: startDate };
        } else if (endDate) {
            bookingFilter.booking_date = { [Op.lte]: endDate };
        }

        const relevantBookings = await Booking.findAll({
            where: bookingFilter,
            attributes: ['payment_id'],
            group: ['payment_id'],
            raw: true,
        });
        const paymentIds = relevantBookings.map(b => b.payment_id).filter(Boolean);

        if (paymentIds.length === 0) {
            return { payments: [], total: 0, totalPaid: 0, totalPending: 0, page, limit, totalPages: 0 };
        }

        // Paso 3: filtro de pagos
        const paymentWhere = { payment_id: { [Op.in]: paymentIds } };
        if (status) paymentWhere.status = status;

        // Paso 4: agregados financieros
        const { fn, col, literal } = PaymentBooking.sequelize;

        const [paidRow] = await PaymentBooking.findAll({
            where: { payment_id: { [Op.in]: paymentIds }, status: 'PAID' },
            attributes: [[fn('COALESCE', fn('SUM', col('amount')), literal('0')), 'sum']],
            raw: true,
        });

        const [pendingRow] = await PaymentBooking.findAll({
            where: { payment_id: { [Op.in]: paymentIds }, status: { [Op.in]: ['PENDING', 'AWAITING_APPROVAL'] } },
            attributes: [[fn('COALESCE', fn('SUM', col('amount')), literal('0')), 'sum']],
            raw: true,
        });

        // Paso 5: pagos paginados — solo datos necesarios para la tabla (resumen)
        // Los datos detallados (comprobante, cita de pago, reservas completas)
        // se obtienen en findPaymentDetail al abrir el panel lateral
        const offset = (page - 1) * limit;

        const { count, rows } = await PaymentBooking.findAndCountAll({
            where: paymentWhere,
            include: [{
                model: Booking,
                as: 'bookings',
                // Solo campos necesarios para: contar reservas, mostrar espacio/deporte y cliente
                attributes: ['booking_id', 'space_id'],
                include: [
                    {
                        model: Space, as: 'space',
                        attributes: ['space_id', 'name'],
                        include: [{ model: SportType, as: 'sportType', attributes: ['sport_type_id', 'name'] }]
                    },
                    {
                        model: User, as: 'user',
                        attributes: ['user_id', 'first_name', 'last_name', 'email'],
                        include: [{ model: Person, as: 'person', attributes: ['phone'] }]
                    }
                ]
            }],
            // Excluye campos de detalle (proof, cita de efectivo, etc.) — disponibles en findPaymentDetail
            attributes: [
                'payment_id', 'status', 'amount', 'method', 'payment_gateway',
                'payment_date', 'created_at'
            ],
            order: [['created_at', 'DESC']],
            limit,
            offset,
            distinct: true,
        });

        return {
            payments: rows.map(p => p.toJSON()),
            total: count,
            totalPaid: parseFloat(paidRow?.sum || 0),
            totalPending: parseFloat(pendingRow?.sum || 0),
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        };
    }

    /**
     * Devuelve un pago con todos sus datos de detalle para el panel lateral.
     * Incluye comprobante, cita de efectivo, fechas de cobro y reservas completas.
     * @param {string|number} paymentId
     */
    async findPaymentDetail(paymentId) {
        const payment = await PaymentBooking.findByPk(paymentId, {
            attributes: [
                'payment_id', 'status', 'amount', 'method', 'payment_gateway',
                'payment_proof_url', 'payment_proof_number',
                'scheduled_payment_date', 'scheduled_payment_time',
                'contact_phone', 'payment_date', 'cash_received_at', 'created_at'
            ],
            include: [{
                model: Booking,
                as: 'bookings',
                attributes: ['booking_id', 'booking_date', 'start_time', 'end_time', 'total_amount', 'status', 'space_id'],
                include: [
                    {
                        model: Space, as: 'space',
                        attributes: ['space_id', 'name'],
                        include: [{ model: SportType, as: 'sportType', attributes: ['sport_type_id', 'name'] }]
                    },
                    {
                        model: User, as: 'user',
                        attributes: ['user_id', 'first_name', 'last_name', 'email'],
                        include: [{ model: Person, as: 'person', attributes: ['phone'] }]
                    }
                ]
            }],
        });
        return payment ? payment.toJSON() : null;
    }

    async getPendingCashBookings() {
        return await Booking.findAll({
            where: {
                status: 'PENDING'
            },
            include: [
                { association: 'payment', include: ['payment_type'] },
                { association: 'space' },
                { association: 'user' }
            ],
            order: [['created_at', 'ASC']]
        });
    }

    /**
     * Devuelve todas las reservas de un usuario (historial del perfil)
     * Incluye pago y espacio. Ordenadas por fecha desc.
     *
     * @param {number} userId   - ID del usuario
     * @param {string} [status] - Filtro opcional: 'PENDING'|'CONFIRMED'|'CANCELED'|'COMPLETED'|'NO_SHOW'
     */
    async getUserBookings(userId, status = null) {
        const whereBooking = { user_id: userId };
        if (status) whereBooking.status = status;

        return await PaymentBooking.findAll({
            include: [
                { association: 'payment_type', attributes: ['name', 'code'] },
                {
                    association: 'bookings',
                    where: whereBooking,
                    include: [
                        {
                            association: 'space',
                            attributes: ['space_id', 'name', 'sucursal_id'],
                            include: [
                                {
                                    association: 'sucursal',
                                    attributes: ['company_id', 'name']
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Calcula estadísticas agregadas del usuario para el panel del perfil
     * Devuelve: total, confirmadas, pendientes, canceladas, gasto total, última reserva
     */
    async getUserBookingStats(userId) {
        const bookings = await Booking.findAll({
            where: { user_id: userId },
            include: [{ association: 'payment', attributes: ['amount', 'status'] }],
            attributes: ['booking_id', 'status', 'booking_date', 'total_amount', 'created_at']
        });

        const today = new Date().toISOString().split('T')[0];

        const stats = {
            total: bookings.length,
            confirmed: 0,
            pending: 0,
            canceled: 0,
            completed: 0,
            upcoming: 0,      // CONFIRMED cuya fecha >= hoy
            total_spent: 0,   // suma de pagos PAID
            last_booking_date: null
        };

        bookings.forEach(b => {
            const dateStr = b.booking_date instanceof Date
                ? b.booking_date.toISOString().split('T')[0]
                : String(b.booking_date).split('T')[0];

            if (b.status === 'CONFIRMED') stats.confirmed++;
            if (b.status === 'PENDING') stats.pending++;
            if (b.status === 'CANCELED') stats.canceled++;
            if (b.status === 'COMPLETED') stats.completed++;

            if (b.status === 'CONFIRMED' && dateStr >= today) stats.upcoming++;

            if (b.payment?.status === 'PAID') {
                stats.total_spent += parseFloat(b.payment.amount || 0);
            }

            if (!stats.last_booking_date || dateStr > stats.last_booking_date) {
                stats.last_booking_date = dateStr;
            }
        });

        stats.total_spent = parseFloat(stats.total_spent.toFixed(2));
        return stats;
    }
}

module.exports = new BookingRepository();
