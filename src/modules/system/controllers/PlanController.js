const PlanHandler = require('../handlers/PlanHandler');

const getAllPlans = async (req, res, next) => {
    await PlanHandler.getAllPlans(req, res, next);
};

const getPlanById = async (req, res, next) => {
    await PlanHandler.getPlanById(req, res, next);
};

const createPlan = async (req, res, next) => {
    await PlanHandler.createPlan(req, res, next);
};

const updatePlan = async (req, res, next) => {
    await PlanHandler.updatePlan(req, res, next);
};

const deletePlan = async (req, res, next) => {
    await PlanHandler.deletePlan(req, res, next);
};

module.exports = {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan
};
