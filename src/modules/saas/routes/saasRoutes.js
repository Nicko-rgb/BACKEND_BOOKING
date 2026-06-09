const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/SaaSCheckoutController');
const { validateDTO } = require('../../../shared/middlewares/validateDTO');
const { checkoutSessionSchema } = require('../dto/CheckoutDto');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');

const asyncHandler = GlobalErrorHandler.asyncHandler;

router.post('/checkout-session', validateDTO(checkoutSessionSchema), asyncHandler(checkoutController.createCheckoutSession));

module.exports = router;
