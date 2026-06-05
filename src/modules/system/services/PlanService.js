const PlanRepository = require('../repositories/PlanRepository');
const { SaaSPlan } = require('../models');
const { NotFoundError, ConflictError } = require('../../../shared/errors/CustomErrors');

class PlanService {
    static async getAllPlans() {
        return await PlanRepository.findAll();
    }

    static async getPlanById(id) {
        const plan = await PlanRepository.findByPk(id);
        if (!plan) throw new NotFoundError(`Plan ${id} no encontrado`);
        return plan;
    }

    static async createPlan(data) {
        const clash = await SaaSPlan.findOne({ where: { code: data.code } });
        if (clash) throw new ConflictError(`Ya existe un plan con el código '${data.code}'`);
        return await PlanRepository.create(data);
    }

    static async updatePlan(id, data) {
        await this.getPlanById(id);
        await PlanRepository.update(id, data);
        return await this.getPlanById(id);
    }

    static async deletePlan(id) {
        await this.getPlanById(id);
        await PlanRepository.destroy(id);
        return true;
    }
}

module.exports = PlanService;
