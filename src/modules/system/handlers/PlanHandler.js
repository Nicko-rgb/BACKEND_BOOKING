const PlanService = require('../services/PlanService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

const getAllPlans = async (req, res, next) => {
    const plans = await PlanService.getAllPlans();
    return ApiResponse.ok(res, plans, 'Planes obtenidos exitosamente');
};

const getPlanById = async (req, res, next) => {
    const plan = await PlanService.getPlanById(Number(req.params.id));
    return ApiResponse.ok(res, plan, 'Plan obtenido exitosamente');
};

const createPlan = async (req, res, next) => {
    const plan = await PlanService.createPlan(req.validatedData);
    return ApiResponse.created(res, plan, 'Plan creado exitosamente');
};

const updatePlan = async (req, res, next) => {
    const plan = await PlanService.updatePlan(Number(req.params.id), req.validatedData);
    return ApiResponse.ok(res, plan, 'Plan actualizado exitosamente');
};

const deletePlan = async (req, res, next) => {
    await PlanService.deletePlan(Number(req.params.id));
    return ApiResponse.ok(res, null, 'Plan eliminado exitosamente');
};

module.exports = {
    getAllPlans,
    getPlanById,
    createPlan,
    updatePlan,
    deletePlan
};
