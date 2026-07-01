import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { OrderService } from '../services/OrderService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { createOrderSchema } from '../validators/order.schema.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();
const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);

router.post('/', validateBody(createOrderSchema), asyncErrorWrapper((req, res) => orderController.placeOrder(req, res)));
router.get('/:id', asyncErrorWrapper((req, res) => orderController.getOrderDetails(req, res)));

export default router;
