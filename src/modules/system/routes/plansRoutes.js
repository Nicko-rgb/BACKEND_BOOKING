const express = require('express');
const router = express.Router();
const PlanController = require('../controllers/PlanController');
const { protegerPermiso } = require('../../../shared/middlewares/proteger');
const { validateDTO } = require('../../../shared/middlewares/validateDTO');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const planSchemas = require('../dtos/PlanDto');

const asyncHandler = GlobalErrorHandler.asyncHandler;

router.get('/', asyncHandler(PlanController.getAllPlans));
router.get('/:id', asyncHandler(PlanController.getPlanById));
router.post('/', ...protegerPermiso('plan.manage'), validateDTO(planSchemas.create), asyncHandler(PlanController.createPlan));
router.put('/:id', ...protegerPermiso('plan.manage'), validateDTO(planSchemas.update), asyncHandler(PlanController.updatePlan));
router.delete('/:id', ...protegerPermiso('plan.manage'), asyncHandler(PlanController.deletePlan));

module.exports = router;
