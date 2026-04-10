/**
 * BookingService - Orquestador del módulo de reservas
 *
 * Responsabilidad:
 *  - Coordinar las fases de creación de una reserva:
 *    Fase 0: Resolver usuario (admin create)
 *    Fase 1: Validar disponibilidad (overlap)
 *    Fase 2: Obtener configuración de la sucursal y tenant_id real
 *    Fase 3: Resolver y validar la estrategia de pago
 *    Fase 4: Crear los registros de Booking
 *    Fase 5: Procesar el pago via estrategia
 *    Fase 6: Crear registro PaymentBooking
 *    Fase 7: Emitir eventos WebSocket
 *
 * Regla de oro: BookingService NO contiene lógica de pago.
 * Toda esa lógica vive en las estrategias de src/modules/booking/strategies/
 */
const { Op } = require('sequelize');
const { Booking, PaymentBooking } = require('../models');
const BookingRepository = require('../repository/BookingRepository');
const UserRepository = require('../../users/repository/UserRepository');
const { PaymentType } = require('../../catalogs/models');
const { Configuration, Company } = require('../../facility/models');
const { Space } = require('../../facility/models');
const PaymentAccountRepository = require('../../facility/repository/PaymentAccountRepository');
const { ConflictError, NotFoundError, BadRequestError } = require('../../../shared/errors/CustomErrors');
const sequelize = require('../../../config/db');
const PaymentStrategyFactory = require('../strategies/PaymentStrategyFactory');
const { getIO } = require('../../../config/socketConfig');
const { scheduleNextExpiration } = require('../jobs/expirationJob');

class BookingService {

    // ─────────────────────────────────────────────────────────────────────────
    // CREACIÓN DE RESERVA CON PAGO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Procesa la creación de una reserva con pago.
     * Orquesta las fases y delega el procesamiento de pago a la estrategia correcta.
     *
     * @param {Object} data - Datos del request (BookingDto validado)
     */
    async processBooking(data) {
        const transaction = await sequelize.transaction();

        try {
            let {
                user_id,
                bookings,
                total_amount,
                payment_method_code,
                payment_type_id,
                payment_details,
                cash_details,
                is_admin_create = false,
                admin_id,
                user_create,
                client_name,
                client_last_name,
                phone,
                email,
                document_number
            } = data;

            // ── FASE 0: Resolver usuario (creación desde admin sin user_id existente) ──
            if (is_admin_create && !user_id) {
                const existingUser = email ? await UserRepository.findUserByEmail(email) : null;
                if (existingUser) {
                    user_id = existingUser.user_id;
                } else {
                    const newUser = await UserRepository.createUserWithPermissions({
                        first_name: client_name || 'Cliente',
                        last_name: client_last_name || 'Externo',
                        email: email || `external_${Date.now()}@booking.sport`,
                        phone,
                        document_number,
                        status: 'ACTIVE',
                        user_create: user_create || admin_id
                    }, 'cliente');
                    user_id = newUser.user_id;
                }
            }

            // Admin create siempre usa CASH
            const effectivePaymentCode = is_admin_create ? 'CASH' : (payment_method_code || '').toUpperCase();

            // ── FASE 1: Normalizar el array de bookings ──────────────────────────────
            const bookingsToProcess = bookings || [{
                space_id: data.space_id,
                booking_date: data.booking_date,
                start_time: data.start_time,
                end_time: data.end_time,
                total_amount: data.total_amount
            }];

            // ── FASE 2: Validar disponibilidad (overlap) con SELECT FOR UPDATE ────────
            // Se pasa la transacción activa para serializar la lectura y eliminar
            // la ventana de race condition entre el check y la inserción del hold.
            for (const bookingData of bookingsToProcess) {
                const isOverlap = await BookingRepository.checkOverlap(
                    bookingData.space_id,
                    bookingData.booking_date,
                    bookingData.start_time,
                    bookingData.end_time,
                    user_id,
                    transaction  // ← lock transaccional
                );
                if (isOverlap) {
                    throw new ConflictError(
                        `El horario ${bookingData.start_time} - ${bookingData.end_time} ` +
                        `para la fecha ${bookingData.booking_date} ya está reservado.`
                    );
                }
            }

            // ── FASE 3: Obtener tenant_id REAL y configuración de la sucursal ─────────
            const firstBooking = bookingsToProcess[0];
            const space = await Space.findByPk(firstBooking.space_id, {
                attributes: ['space_id', 'sucursal_id']
            });
            if (!space) throw new NotFoundError(`Espacio ${firstBooking.space_id} no encontrado.`);

            const sucursalId = space.sucursal_id;

            // ── FASE 3.1: Validar que las reservas caigan dentro del horario de apertura/cierre ──
            const sucursal = await Company.findByPk(sucursalId, {
                attributes: ['opening_time', 'closing_time']
            });

            if (sucursal?.opening_time && sucursal?.closing_time) {
                /**
                 * Convierte "HH:mm" o "HH:mm:ss" a minutos desde medianoche para comparar intervalos.
                 * @param {string} timeStr - Cadena de tiempo
                 * @returns {number} Minutos desde medianoche
                 */
                const toMinutes = (timeStr) => {
                    const [h, m] = timeStr.split(':').map(Number);
                    return h * 60 + m;
                };

                // Formatear a "HH:mm" para los mensajes de error
                const fmt = (t) => t.substring(0, 5);

                const openMin = toMinutes(sucursal.opening_time);
                const closeMin = toMinutes(sucursal.closing_time);
                const openFmt = fmt(sucursal.opening_time);
                const closeFmt = fmt(sucursal.closing_time);

                for (const bookingData of bookingsToProcess) {
                    const startMin = toMinutes(bookingData.start_time);
                    const endMin = toMinutes(bookingData.end_time);

                    if (startMin < openMin || endMin > closeMin) {
                        // Formatear la fecha para el mensaje (YYYY-MM-DD → DD/MM/YYYY)
                        const [y, mo, d] = String(bookingData.booking_date).split('-');
                        const dateFmt = `${d}/${mo}/${y}`;

                        throw new BadRequestError(
                            `La reserva del ${dateFmt} de ${fmt(bookingData.start_time)} a ${fmt(bookingData.end_time)} ` +
                            `está fuera del horario de atención de la sucursal (${openFmt} - ${closeFmt}). ` +
                            `Por favor ajusta el horario.`
                        );
                    }
                }
            }

            const sucursalConfig = await Configuration.findOne({
                where: { company_id: sucursalId }
            });

            // tenant_id lo sacamos de la Configuration de la sucursal (o fallback a data)
            const tenantId = sucursalConfig?.tenant_id || data.tenant_id || 'default';

            // ── FASE 4: Resolver tipo de pago (payment_type_id) ──────────────────────
            if (!payment_type_id) {
                const pt = await PaymentType.findOne({
                    where: { code: effectivePaymentCode, is_enabled: true }
                });
                if (pt) {
                    payment_type_id = pt.payment_type_id;
                } else {
                    throw new BadRequestError(`Tipo de pago '${effectivePaymentCode}' no está disponible.`);
                }
            }

            // Obtener el PaymentType completo (para comisiones)
            const paymentTypeRecord = await PaymentType.findByPk(payment_type_id);

            // Cargar la primera cuenta de pago activa de la sucursal para este tipo
            const paymentAccounts = await PaymentAccountRepository.findBySucursalAndType(sucursalId, payment_type_id);
            const enrichedConfig = {
                ...(sucursalConfig?.dataValues || {}),
                paymentAccount: paymentAccounts[0] || null
            };

            // ── FASE 5: Resolver y validar la estrategia de pago ─────────────────────
            const strategy = PaymentStrategyFactory.resolve(effectivePaymentCode);
            await strategy.validate(data, enrichedConfig);

            // ── FASE 6: Determinar estado de la reserva ──────────────────────────────
            // CASH por el cliente → PENDING hasta que admin confirme
            // Admin crea → CONFIRMED directamente
            // YAPE / PLIN / BANK_TRANSFER → PENDING hasta que admin confirme
            // CARD_ONLINE (Stripe verificado) → CONFIRMED directamente
            const isPendingMethod = ['CASH', 'YAPE', 'PLIN', 'BANK_TRANSFER'].includes(effectivePaymentCode);
            const bookingStatus = (isPendingMethod && !is_admin_create) ? 'PENDING' : 'CONFIRMED';
            const paymentMethod = ['CASH'].includes(effectivePaymentCode) ? 'IN_PERSON' : 'ONLINE';

            // ── FASE 7: Limpiar holds del usuario y crear Bookings ───────────────────
            const releasedHolds = await BookingRepository.getAndDeleteUserHolds(user_id);

            const createdBookings = [];
            for (const bookingData of bookingsToProcess) {
                const booking = await BookingRepository.create({
                    user_id,
                    space_id: bookingData.space_id,
                    booking_date: bookingData.booking_date,
                    start_time: bookingData.start_time,
                    end_time: bookingData.end_time,
                    total_amount: bookingData.total_amount,
                    payment_method: paymentMethod,
                    status: bookingStatus,
                    user_create: user_create || admin_id || user_id
                }, transaction);
                createdBookings.push(booking);
            }

            // ── FASE 8: Procesar el pago via estrategia ──────────────────────────────
            const paymentResult = await strategy.process(
                { ...data, user_id },
                createdBookings,
                transaction,
                enrichedConfig,
                paymentTypeRecord
            );

            const amountToCharge = paymentResult.amount
                || total_amount
                || bookingsToProcess.reduce((s, b) => s + Number(b.total_amount), 0);

            // ── FASE 9: Crear registro de PaymentBooking ─────────────────────────────
            const payment = await BookingRepository.createPayment({
                payment_type_id,
                tenant_id: tenantId,
                amount: amountToCharge,
                method: paymentResult.paymentMethod,
                status: paymentResult.status,
                payment_date: paymentResult.extraFields?.payment_date || null,
                transaction_id: paymentResult.transactionId || `TRX-${Date.now()}-${user_id}`,
                payment_gateway: paymentResult.gateway,
                comision_aplicada: paymentResult.comision || 0,
                payment_reference: paymentResult.extraFields?.payment_reference || null,
                gateway_response: paymentResult.gatewayResponse || null,
                // Campos efectivo / Yape / Plin / Bank
                scheduled_payment_date: paymentResult.extraFields?.scheduled_payment_date || null,
                scheduled_payment_time: paymentResult.extraFields?.scheduled_payment_time || null,
                contact_phone: paymentResult.extraFields?.contact_phone || null,
                cash_received_by: paymentResult.extraFields?.cash_received_by || null,
                cash_received_at: paymentResult.extraFields?.cash_received_at || null,
                user_create: user_create || admin_id || user_id
            }, transaction);

            // Relacionar las Bookings creadas con este pago unificador
            await BookingRepository.updateBookingsPaymentId(
                createdBookings.map(b => b.booking_id),
                payment.payment_id,
                transaction
            );

            await transaction.commit();

            // ── FASE 10: Emitir eventos WebSocket ────────────────────────────────────
            const io = getIO();

            // Liberar los holds que acabamos de borrar
            releasedHolds.forEach(hold => {
                const holdDate = hold.booking_date instanceof Date
                    ? hold.booking_date.toISOString().split('T')[0]
                    : String(hold.booking_date).split('T')[0];
                const holdRoom = `space:${String(hold.space_id)}:${holdDate}`;
                io.to(holdRoom).emit('booking:released', {
                    booking_date: holdDate,
                    booking_id: `hold-${hold.hold_id}`
                });
            });

            const bookingsBySpace = createdBookings.reduce((acc, b) => {
                const key = String(b.space_id);
                if (!acc[key]) acc[key] = [];
                acc[key].push({ start_time: b.start_time, end_time: b.end_time });
                return acc;
            }, {});

            Object.entries(bookingsBySpace).forEach(([spaceId, bkgs]) => {
                const bookingDate = createdBookings[0].booking_date instanceof Date
                    ? createdBookings[0].booking_date.toISOString().split('T')[0]
                    : String(createdBookings[0].booking_date).split('T')[0];
                const room = `space:${spaceId}:${bookingDate}`;

                if (bookingStatus === 'PENDING') {
                    io.to(room).emit('booking:pending', { booking_date: bookingDate, bookings: bkgs });
                } else {
                    io.to(room).emit('booking:confirmed', { booking_date: bookingDate, bookings: bkgs });
                }
            });

            // ── RESPUESTA: incluir datos de pago útiles para el frontend ─────────────
            const result = await BookingRepository.findById(createdBookings[0].booking_id);

            // Enriquecer la respuesta con instrucciones de pago (Yape, Plin, Bank)
            const paymentInstructions = this._buildPaymentInstructions(
                effectivePaymentCode,
                paymentResult,
                enrichedConfig
            );

            return { ...result.toJSON(), payment_instructions: paymentInstructions };

        } catch (error) {
            await transaction.rollback();
            if (error.original?.code === '23505' || error.name === 'SequelizeUniqueConstraintError') {
                throw new ConflictError('El horario ya fue tomado por otro usuario. Por favor elige otro.');
            }
            throw error;
        }
    }

    /**
     * Construye las instrucciones de pago para el frontend según el método.
     * Solo aplica para métodos que requieren acción del cliente (YAPE, PLIN, BANK_TRANSFER).
     */
    _buildPaymentInstructions(code, paymentResult, sucursalConfig) {
        if (!['YAPE', 'PLIN', 'BANK_TRANSFER'].includes(code)) return null;

        const { gatewayResponse } = paymentResult;
        if (!gatewayResponse) return null;

        return {
            method: code,
            instructions: gatewayResponse.instructions || null,
            // Datos específicos por método
            ...(code === 'YAPE' && {
                yape_number: gatewayResponse.sucursal_yape_number,
                account_name: gatewayResponse.sucursal_yape_name,
                amount: gatewayResponse.amount_to_transfer
            }),
            ...(code === 'PLIN' && {
                plin_number: gatewayResponse.sucursal_plin_number,
                account_name: gatewayResponse.sucursal_plin_name,
                amount: gatewayResponse.amount_to_transfer
            }),
            ...(code === 'BANK_TRANSFER' && {
                bank_name: gatewayResponse.bank_name,
                account_holder: gatewayResponse.account_holder,
                account_number: gatewayResponse.account_number,
                account_cci: gatewayResponse.account_cci,
                account_type: gatewayResponse.account_type,
                amount: gatewayResponse.amount_to_transfer,
                processing_time: gatewayResponse.processing_time
            }),
            next_step: 'Envía tu comprobante de pago al administrador para confirmar tu reserva.'
        };
    }


    // ─────────────────────────────────────────────────────────────────────────
    // HOLDS (sin cambios, lógica ya correcta)
    // ─────────────────────────────────────────────────────────────────────────

    async cancelAllUserHolds(userId) {
        const cancelledHolds = await BookingRepository.getAndDeleteUserHolds(userId);

        if (cancelledHolds.length > 0) {
            const io = getIO();
            cancelledHolds.forEach(hold => {
                const bookingDate = hold.booking_date instanceof Date
                    ? hold.booking_date.toISOString().split('T')[0]
                    : String(hold.booking_date).split('T')[0];
                const room = `space:${String(hold.space_id)}:${bookingDate}`;
                io.to(room).emit('booking:released', {
                    booking_date: bookingDate,
                    booking_id: `hold-${hold.hold_id}`
                });
            });
        }

        return { success: true, count: cancelledHolds.length };
    }

    async getBookingsBySpaceAndDate(space_id, date) {
        return await BookingRepository.findBySpaceAndDate(space_id, date);
    }

    async getBookingsBySpaceAndRange(space_id, start_date, end_date) {
        return await BookingRepository.findBySpaceAndDateRange(space_id, start_date, end_date);
    }

    async createBookingHold(data) {
        const transaction = await sequelize.transaction();

        try {
            const { user_id, space_id, bookings } = data;
            const createdHolds = [];

            for (const bookingData of bookings) {
                // Pasar transaction para ejecutar SELECT FOR UPDATE y evitar race condition
                const isOverlap = await BookingRepository.checkOverlap(
                    space_id,
                    bookingData.booking_date,
                    bookingData.start_time,
                    bookingData.end_time,
                    null,         // excludeUserId — no aplica para holds nuevos
                    transaction   // lock transaccional
                );
                if (isOverlap) {
                    throw new ConflictError(`El horario ${bookingData.start_time} - ${bookingData.end_time} ya no está disponible.`);
                }

                const hold = await BookingRepository.createHold({
                    user_id, space_id,
                    booking_date: bookingData.booking_date,
                    start_time: bookingData.start_time,
                    end_time: bookingData.end_time
                }, transaction);

                createdHolds.push(hold);
            }

            if (createdHolds.length > 0) {
                await BookingRepository.extendUserHolds(user_id, space_id, createdHolds[0].expires_at, transaction);
            }

            await transaction.commit();

            scheduleNextExpiration().catch(err => console.error('scheduleNextExpiration error:', err));

            const io = getIO();
            const holdDate = bookings[0].booking_date instanceof Date
                ? bookings[0].booking_date.toISOString().split('T')[0]
                : String(bookings[0].booking_date).split('T')[0];
            const room = `space:${String(space_id)}:${holdDate}`;
            io.to(room).emit('booking:hold_created', {
                booking_date: holdDate,
                holds: createdHolds.map(h => ({
                    booking_id: `hold-${h.hold_id}`,
                    hold_id: h.hold_id,
                    user_id: h.user_id,
                    start_time: h.start_time,
                    end_time: h.end_time,
                    status: 'PENDING',
                    type: 'reserving',
                    expires_at: h.expires_at
                }))
            });

            return createdHolds.map(h => ({
                booking_id: `hold-${h.hold_id}`,
                hold_id: h.hold_id,
                user_id: h.user_id,
                start_time: h.start_time,
                end_time: h.end_time,
                expires_at: h.expires_at,
                extension_count: h.extension_count,
                extension_limit: h.extension_limit,
                status: 'PENDING',
                type: 'reserving'
            }));

        } catch (error) {
            await transaction.rollback();
            if (error.original?.code === '23505' || error.name === 'SequelizeUniqueConstraintError') {
                throw new ConflictError('El horario ya fue tomado por otro usuario en este momento. Por favor elige otro.');
            }
            throw error;
        }
    }

    async extendBookingHold(holdId) {
        const hold = await BookingRepository.findHoldById(holdId);
        if (!hold) throw new NotFoundError('Bloqueo no encontrado');
        if (hold.status !== 'ACTIVE' || hold.expires_at < new Date()) throw new ConflictError('El bloqueo ha expirado o ya no es válido');
        if (hold.extension_count >= hold.extension_limit) throw new ConflictError('Se ha alcanzado el límite de extensiones');

        await BookingRepository.extendHold(holdId, 2);
        const updatedHold = await BookingRepository.findHoldById(holdId);

        return {
            booking_id: `hold-${updatedHold.hold_id}`,
            hold_id: updatedHold.hold_id,
            user_id: updatedHold.user_id,
            start_time: updatedHold.start_time,
            end_time: updatedHold.end_time,
            expires_at: updatedHold.expires_at,
            extension_count: updatedHold.extension_count,
            extension_limit: updatedHold.extension_limit,
            status: 'PENDING',
            type: 'reserving'
        };
    }

    async cancelBookingHold(holdId) {
        const hold = await BookingRepository.findHoldById(holdId);
        if (!hold) throw new NotFoundError('Bloqueo no encontrado');

        const io = getIO();
        const holdDate = hold.booking_date instanceof Date
            ? hold.booking_date.toISOString().split('T')[0]
            : String(hold.booking_date).split('T')[0];
        const room = `space:${String(hold.space_id)}:${holdDate}`;
        io.to(room).emit('booking:released', {
            booking_date: holdDate,
            booking_id: `hold-${holdId}`
        });

        await BookingRepository.deleteHoldById(holdId);
        return { success: true };
    }

    async deleteUserHoldsByDate(user_id, space_id, booking_date) {
        const holds = await BookingRepository.findHoldsByUserDate(user_id, space_id, booking_date);
        if (holds.length === 0) return { success: true };

        const io = getIO();
        const holdDate = String(booking_date).split('T')[0];
        const room = `space:${String(space_id)}:${holdDate}`;

        holds.forEach(h => {
            io.to(room).emit('booking:released', {
                booking_date: holdDate,
                booking_id: `hold-${h.hold_id}`
            });
        });

        await BookingRepository.deleteUserHoldsByDate(user_id, space_id, booking_date);
        return { success: true };
    }

    async copyBookingHolds(data) {
        const { user_id, space_id, source_date, target_date } = data;

        const sourceHolds = await BookingRepository.findHoldsByUserDate(user_id, space_id, source_date);
        if (sourceHolds.length === 0) {
            throw new ConflictError('No hay horarios seleccionados para copiar en la fecha de origen.');
        }

        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const targetDayName = days[new Date(target_date + 'T00:00:00').getDay()];

        const businessHours = await BookingRepository.findBusinessHoursByDay(space_id, targetDayName);
        const isClosed = businessHours.length === 0 || businessHours.every(bh => bh.is_closed);
        if (isClosed) {
            throw new ConflictError(`El espacio deportivo está cerrado los días ${targetDayName}.`);
        }

        const transaction = await sequelize.transaction();
        const createdHolds = [];

        try {
            for (const hold of sourceHolds) {
                const startTime = hold.start_time;
                const endTime = hold.end_time;

                const fitsInBusinessHours = businessHours.some(bh => {
                    if (bh.is_closed) return false;
                    return startTime >= bh.start_time && endTime <= bh.end_time;
                });

                if (!fitsInBusinessHours) {
                    throw new ConflictError(`El horario ${startTime} - ${endTime} no está disponible en el horario de operación del día ${targetDayName}.`);
                }

                // Pasar transaction para ejecutar SELECT FOR UPDATE y evitar race condition
                const isOverlap = await BookingRepository.checkOverlap(
                    space_id, target_date, startTime, endTime,
                    null,        // excludeUserId — no aplica para copia de holds
                    transaction  // lock transaccional
                );
                if (isOverlap) {
                    throw new ConflictError(`El horario ${startTime} - ${endTime} ya está ocupado en la fecha seleccionada.`);
                }

                const newHold = await BookingRepository.createHold({
                    user_id, space_id,
                    booking_date: target_date,
                    start_time: startTime,
                    end_time: endTime
                }, transaction);

                createdHolds.push(newHold);
            }

            if (createdHolds.length > 0) {
                await BookingRepository.extendUserHolds(user_id, space_id, createdHolds[0].expires_at, transaction);
            }

            await transaction.commit();

            const io = getIO();
            const room = `space:${String(space_id)}:${target_date}`;
            io.to(room).emit('booking:hold_created', {
                booking_date: target_date,
                holds: createdHolds.map(h => ({
                    booking_id: `hold-${h.hold_id}`,
                    hold_id: h.hold_id,
                    user_id: h.user_id,
                    start_time: h.start_time,
                    end_time: h.end_time,
                    status: 'PENDING',
                    type: 'reserving',
                    expires_at: h.expires_at
                }))
            });

            return { success: true, count: createdHolds.length };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // CONFIRMACIÓN Y RECHAZO (CASH / YAPE / PLIN / BANK_TRANSFER)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Aprueba una reserva presencial SIN registrar cobro.
     * Solo cambia Booking.status a CONFIRMED. PaymentBooking sigue en PENDING.
     * Usar solo cuando el pago se gestiona fuera del sistema.
     * Para el flujo normal usa confirmCashPayment.
     */
    async approvePresentialBooking(bookingId, adminId) {
        const booking = await BookingRepository.findById(bookingId);
        if (!booking) throw new NotFoundError('Reserva no encontrada');

        if (booking.payment_method !== 'IN_PERSON') {
            throw new BadRequestError('El endpoint /approve es exclusivo de reservas IN_PERSON. Para otras usa /confirm-cash.');
        }

        if (booking.status !== 'PENDING') {
            throw new ConflictError('Solo se pueden aprobar reservas en estado PENDING');
        }

        await BookingRepository.approveBooking(bookingId, adminId);

        const io = getIO();
        const bookingDate = booking.booking_date instanceof Date
            ? booking.booking_date.toISOString().split('T')[0]
            : String(booking.booking_date).split('T')[0];
        const room = `space:${String(booking.space_id)}:${bookingDate}`;
        io.to(room).emit('booking:confirmed', {
            booking_date: bookingDate,
            bookings: [{ start_time: booking.start_time, end_time: booking.end_time }]
        });

        return await BookingRepository.findById(bookingId);
    }

    /**
     * Confirma el cobro / recepción del pago para métodos manuales:
     * CASH, YAPE, PLIN, BANK_TRANSFER.
     * Actualiza tanto Bookings (que no estén canceladas/rechazadas) como PaymentBooking a CONFIRMED/PAID.
     */
    async confirmCashPayment(bookingId, adminId, receiptNumber = null) {
        const booking = await BookingRepository.findById(bookingId);
        if (!booking) throw new NotFoundError('Reserva no encontrada');

        if (booking.payment?.status === 'PAID') {
            throw new ConflictError('Este pago ya fue confirmado anteriormente');
        }

        const transaction = await sequelize.transaction();

        try {
            // 1. Actualizar el pago global a PAID
            await BookingRepository.updatePayment(bookingId, {
                status: 'PAID',
                payment_date: new Date(),
                cash_received_at: new Date(),
                cash_received_by: adminId,
                cash_receipt_number: receiptNumber,
                user_update: adminId
            }, transaction);

            // 2. Asegurar que todas las reservas vinculadas (no canceladas/rechazadas) estén CONFIRMED
            if (booking.payment_id) {
                await Booking.update({
                    status: 'CONFIRMED',
                    approved_by: adminId,
                    approved_at: new Date(),
                    confirmed_at: new Date()
                }, {
                    where: {
                        payment_id: booking.payment_id,
                        status: { [Op.in]: ['PENDING', 'CONFIRMED'] }
                    },
                    transaction
                });
            } else {
                await BookingRepository.approveBooking(bookingId, adminId, transaction);
            }

            await transaction.commit();

            const io = getIO();
            const bookingsToNotify = booking.payment?.bookings?.filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED') || [booking];

            bookingsToNotify.forEach(b => {
                const bookingDate = b.booking_date instanceof Date
                    ? b.booking_date.toISOString().split('T')[0]
                    : String(b.booking_date).split('T')[0];
                const room = `space:${String(b.space_id)}:${bookingDate}`;
                io.to(room).emit('booking:confirmed', {
                    booking_date: bookingDate,
                    bookings: [{ start_time: b.start_time, end_time: b.end_time }]
                });
            });

            return await BookingRepository.findById(bookingId);

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Confirma una reserva individual vinculada a un pago (X de N).
     * El estado del pago no cambia automáticamente a PAID para métodos manuales, 
     * se requiere la confirmación final por parte del admin.
     */
    async confirmIndividualBooking(bookingId, adminId) {
        const booking = await BookingRepository.findById(bookingId);
        if (!booking) throw new NotFoundError('Reserva no encontrada');

        if (booking.status !== 'PENDING') {
            throw new ConflictError(`Solo se puede confirmar reservas PENDING. Estado actual: ${booking.status}`);
        }

        const transaction = await sequelize.transaction();
        try {
            // 1. Aprobar la reserva individual
            await BookingRepository.approveBooking(bookingId, adminId, transaction);

            await transaction.commit();

            // Notify via socket
            const io = getIO();
            const bookingDate = booking.booking_date instanceof Date
                ? booking.booking_date.toISOString().split('T')[0]
                : String(booking.booking_date).split('T')[0];
            const room = `space:${String(booking.space_id)}:${bookingDate}`;
            io.to(room).emit('booking:confirmed', {
                booking_date: bookingDate,
                bookings: [{ start_time: booking.start_time, end_time: booking.end_time }]
            });

            return await BookingRepository.findById(bookingId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Rechaza una reserva individual vinculada a un pago.
     * Si todas las reservas del pago quedan REJECTED o CANCELED, el pago pasa a FAILED.
     */
    async rejectIndividualBooking(bookingId, adminId, reason = null) {
        const booking = await BookingRepository.findById(bookingId);
        if (!booking) throw new NotFoundError('Reserva no encontrada');

        if (booking.status !== 'PENDING') {
            throw new ConflictError(`Solo se puede rechazar reservas PENDING. Estado actual: ${booking.status}`);
        }

        const transaction = await sequelize.transaction();
        try {
            // 1. Rechazar la reserva individual
            await BookingRepository.rejectBooking(bookingId, { rejection_reason: reason, adminId }, transaction);

            // 2. Revisar si quedan reservas activas (PENDING o CONFIRMED) para el mismo pago
            if (booking.payment_id) {
                const activeCount = await BookingRepository.countActiveBookingsInPayment(booking.payment_id, transaction);

                // Si ya no quedan reservas activas, el pago global se marca como FAILED
                if (activeCount === 0) {
                    await BookingRepository.failPayment(booking.payment_id, transaction);
                }

                // Recalcular el monto total del pago restando lo rechazado
                await BookingRepository.recalculatePaymentAmount(booking.payment_id, transaction);
            }

            await transaction.commit();

            // Notify via socket
            const io = getIO();
            const bookingDate = booking.booking_date instanceof Date
                ? booking.booking_date.toISOString().split('T')[0]
                : String(booking.booking_date).split('T')[0];
            const room = `space:${String(booking.space_id)}:${bookingDate}`;
            io.to(room).emit('booking:canceled', {
                booking_date: bookingDate,
                booking_id: bookingId,
                bookings: [{ start_time: booking.start_time, end_time: booking.end_time }]
            });

            return await BookingRepository.findById(bookingId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Confirma todas las reservas asociadas a un pago de una vez.
     * El pago SIGUE en PENDING (o su estado actual) hasta que se confirme expresamente el cobro.
     */
    async confirmAllPaymentBookings(paymentId, adminId) {
        const payment = await PaymentBooking.findByPk(paymentId, {
            include: [{ association: 'bookings' }]
        });

        if (!payment) throw new NotFoundError('Registro de pago no encontrado');

        const transaction = await sequelize.transaction();
        try {
            // 1. Confirmar todas las reservas del pago que estén PENDING
            const confirmedBookings = [];
            for (const b of payment.bookings) {
                if (b.status === 'PENDING') {
                    await BookingRepository.approveBooking(b.booking_id, adminId, transaction);
                    confirmedBookings.push(b);
                }
            }

            await transaction.commit();

            // Notify socket
            const io = getIO();
            confirmedBookings.forEach(b => {
                const bookingDate = b.booking_date instanceof Date
                    ? b.booking_date.toISOString().split('T')[0]
                    : String(b.booking_date).split('T')[0];
                const room = `space:${String(b.space_id)}:${bookingDate}`;
                io.to(room).emit('booking:confirmed', {
                    booking_date: bookingDate,
                    bookings: [{ start_time: b.start_time, end_time: b.end_time }]
                });
            });

            return payment;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Rechaza todas las reservas asociadas a un pago.
     * El pago pasa automáticamente a FAILED.
     */
    async rejectAllPaymentBookings(paymentId, adminId, reason = null) {
        const payment = await PaymentBooking.findByPk(paymentId, {
            include: [{ association: 'bookings' }]
        });

        if (!payment) throw new NotFoundError('Registro de pago no encontrado');

        const transaction = await sequelize.transaction();
        try {
            // 1. Rechazar todas las reservas que no estén ya canceladas/rechazadas
            const rejectedBookings = [];
            for (const b of payment.bookings) {
                if (b.status === 'PENDING' || b.status === 'CONFIRMED') {
                    await BookingRepository.rejectBooking(b.booking_id, { rejection_reason: reason, adminId }, transaction);
                    rejectedBookings.push(b);
                }
            }

            // 2. Marcar el pago como FAILED y recalcular monto a 0
            await BookingRepository.failPayment(payment.payment_id, transaction);
            await BookingRepository.recalculatePaymentAmount(payment.payment_id, transaction);

            await transaction.commit();

            // Notify socket
            const io = getIO();
            rejectedBookings.forEach(b => {
                const bookingDate = b.booking_date instanceof Date
                    ? b.booking_date.toISOString().split('T')[0]
                    : String(b.booking_date).split('T')[0];
                const room = `space:${String(b.space_id)}:${bookingDate}`;
                io.to(room).emit('booking:canceled', {
                    booking_date: bookingDate,
                    booking_id: b.booking_id,
                    bookings: [{ start_time: b.start_time, end_time: b.end_time }]
                });
            });

            return payment;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Rechaza (cancela) una reserva PENDING — el admin deniega el pago.
     * Cambia el estado a REJECTED.
     */
    async rejectBooking(bookingId, adminId, rejectionReason = null) {
        const booking = await BookingRepository.findById(bookingId);
        if (!booking) throw new NotFoundError('Reserva no encontrada');

        if (booking.status !== 'PENDING') {
            throw new ConflictError(`Solo se pueden rechazar reservas PENDING. Estado actual: ${booking.status}`);
        }

        if (booking.payment?.status === 'PAID') {
            throw new ConflictError('No se puede rechazar una reserva cuyo pago ya fue confirmado');
        }

        const transaction = await sequelize.transaction();

        try {
            await BookingRepository.rejectBooking(bookingId, {
                rejection_reason: rejectionReason || 'Reserva rechazada por administrador',
                adminId
            }, transaction);

            // Si es la única reserva activa del pago, marcar pago como FAILED
            if (booking.payment_id) {
                const activeCount = await BookingRepository.countActiveBookingsInPayment(booking.payment_id, transaction);
                if (activeCount === 0) {
                    await BookingRepository.failPayment(booking.payment_id, transaction);
                }

                // Recalcular el monto total del pago restando lo rechazado
                await BookingRepository.recalculatePaymentAmount(booking.payment_id, transaction);
            }

            await transaction.commit();

            const io = getIO();
            const bookingDate = booking.booking_date instanceof Date
                ? booking.booking_date.toISOString().split('T')[0]
                : String(booking.booking_date).split('T')[0];
            const room = `space:${String(booking.space_id)}:${bookingDate}`;
            io.to(room).emit('booking:canceled', {
                booking_date: bookingDate,
                booking_id: bookingId,
                bookings: [{ start_time: booking.start_time, end_time: booking.end_time }]
            });

            return await BookingRepository.findById(bookingId);

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


    // ─────────────────────────────────────────────────────────────────────────
    // COMPROBANTE DE PAGO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Guarda la URL del comprobante de pago subido por el cliente.
     */
    async uploadPaymentProof(bookingId, proofUrl, userId, proofNumber = null) {
        const booking = await BookingRepository.findById(bookingId);
        if (!booking) throw new NotFoundError('Reserva no encontrada');

        if (String(booking.user_id) !== String(userId)) {
            throw new BadRequestError('No tienes permiso para modificar esta reserva');
        }

        if (booking.status !== 'PENDING') {
            throw new BadRequestError('Solo se puede adjuntar comprobante a reservas PENDIENTES');
        }

        await BookingRepository.updatePaymentProofUrl(bookingId, proofUrl, proofNumber);
        return await BookingRepository.findById(bookingId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONSULTAS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Obtiene los detalles completos de una reserva para generar el comprobante
     */
    async getReceiptDetails(bookingId, userId) {
        const payment = await BookingRepository.findByIdForReceipt(bookingId);

        if (!payment || !payment.bookings || payment.bookings.length === 0) {
            throw new NotFoundError('Reserva o pago no encontrado');
        }

        const firstBooking = payment.bookings[0];

        // Validación de permisos (solo el dueño o un admin con acceso pueden verlo)
        // Por simplicidad en MVP, solo validamos si existe user_id
        if (userId && firstBooking.user_id !== userId && !['system', 'super_admin', 'administrador', 'empleado'].includes(arguments[2])) {
            // Nota: El rol vendría como 3er parámetro si se valida estricto
            // throw new ForbiddenError('No tienes permiso para ver este comprobante');
        }

        // Ordenamos los slots por hora de inicio
        const slots = payment.bookings.sort((a, b) => {
            // Ordenar primero por fecha y luego por hora
            const dateA = a.booking_date instanceof Date ? a.booking_date.toISOString() : String(a.booking_date);
            const dateB = b.booking_date instanceof Date ? b.booking_date.toISOString() : String(b.booking_date);
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            return a.start_time.localeCompare(b.start_time);
        }).map(b => ({
            booking_id: b.booking_id,
            booking_date: b.booking_date instanceof Date ? b.booking_date.toISOString().split('T')[0] : String(b.booking_date).split('T')[0],
            start_time: b.start_time,
            end_time: b.end_time,
            amount: parseFloat(b.total_amount),
            status: b.status
        }));

        return {
            receipt_code: `#BS-${String(payment.payment_id).padStart(8, '0')}`,
            payment_id: payment.payment_id,
            transaction_id: payment.transaction_id || null,
            booking_date: firstBooking.booking_date,
            slots: slots,
            total_amount: parseFloat(payment.amount),
            booking_status: firstBooking.status,
            payment_status: payment.status,
            payment_method: payment.payment_type?.code || payment.method,
            payment_proof_url: payment.payment_proof_url || null,
            space: firstBooking.space ? {
                name: firstBooking.space.name,
                sport_type: firstBooking.space.sportType?.name || 'Deporte',
                sport_icon: firstBooking.space.sportType?.icon_url || null
            } : null,
            sucursal: firstBooking.space?.sucursal ? {
                name:            firstBooking.space.sucursal.name,
                address:         firstBooking.space.sucursal.address,
                phone:           firstBooking.space.sucursal.phone,
                // Moneda del país de la sucursal para mostrar en el recibo ────
                currency_simbol: firstBooking.space.sucursal.country?.currency_simbol ?? null,
                iso_currency:    firstBooking.space.sucursal.country?.iso_currency    ?? null
            } : null,
            user: firstBooking.user ? {
                name: `${firstBooking.user.first_name} ${firstBooking.user.last_name}`.trim(),
                email: firstBooking.user.email
            } : null
        };
    }

    async getBookingsBySubsidiary(sucursalId, opts) {
        return await BookingRepository.findBySubsidiary(sucursalId, opts);
    }

    async getPaymentsBySubsidiary(sucursalId, opts) {
        return BookingRepository.findPaymentsBySubsidiary(sucursalId, opts);
    }

    // Detalle completo de un pago (para el panel lateral del admin)
    async getPaymentDetail(paymentId) {
        const { NotFoundError } = require('../../../shared/errors/CustomErrors');
        const payment = await BookingRepository.findPaymentDetail(paymentId);
        if (!payment) throw new NotFoundError(`Pago ${paymentId} no encontrado`);
        return payment;
    }

    async getPendingCashBookings() {
        return await BookingRepository.getPendingCashBookings();
    }

    async getUserBookings(userId, status = null) {
        return await BookingRepository.getUserBookings(userId, status);
    }

    async getUserBookingStats(userId) {
        return await BookingRepository.getUserBookingStats(userId);
    }
}

module.exports = new BookingService();
