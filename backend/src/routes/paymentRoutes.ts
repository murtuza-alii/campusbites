import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController.js';
import { PaymentService } from '../services/PaymentService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();
const paymentService = new PaymentService();
const orderRepository = new OrderRepository();
const paymentController = new PaymentController(paymentService, orderRepository);

// Initialize Cashfree checkout session
router.post('/create-order', asyncErrorWrapper((req, res) => paymentController.createPaymentSession(req, res)));

// Verify payment status after customer returns from checkout
router.post('/verify', asyncErrorWrapper((req, res) => paymentController.verifyPayment(req, res)));

// Cashfree Webhook callback endpoint
router.post('/webhook', asyncErrorWrapper((req, res) => paymentController.handleWebhook(req, res)));

export default router;
