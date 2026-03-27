const BusinessHour = require('../models/BusinessHour');

/**
 * Repository para el manejo de horarios de funcionamiento
 */
class BusinessHourRepository {
    /**
     * Crear múltiples horarios
     */
    async bulkCreate(schedules) {
        return await BusinessHour.bulkCreate(schedules);
    }

    /**
     * Eliminar horarios de un espacio
     */
    async deleteBySpaceId(spaceId) {
        return await BusinessHour.destroy({
            where: { space_id: spaceId }
        });
    }

    /**
     * Obtener horarios de un espacio
     */
    async findBySpaceId(spaceId) {
        return await BusinessHour.findAll({
            where: { space_id: spaceId },
            order: [['day_of_week', 'ASC'], ['start_time', 'ASC']]
        });
    }

    /**
     * Actualiza el estado de cierre de todos los horarios de un día específico para un espacio
     */
    async updateIsClosedByDay(spaceId, dayOfWeek, isClosed, userId) {
        return await BusinessHour.update(
            { is_closed: isClosed, user_update: userId },
            { 
                where: { 
                    space_id: spaceId,
                    day_of_week: dayOfWeek
                } 
            }
        );
    }
}

module.exports = new BusinessHourRepository();
