const { SaaSPlan } = require('../models');

class PlanRepository {
    static async findAll() {
        return await SaaSPlan.findAll({
            order: [['price_monthly', 'ASC']]
        });
    }

    static async findByPk(id) {
        return await SaaSPlan.findByPk(id);
    }

    static async create(data) {
        return await SaaSPlan.create(data);
    }

    static async update(id, data) {
        const [affected] = await SaaSPlan.update(data, {
            where: { plan_id: id }
        });
        return affected > 0;
    }

    static async destroy(id) {
        return await SaaSPlan.destroy({
            where: { plan_id: id }
        });
    }
}

module.exports = PlanRepository;
