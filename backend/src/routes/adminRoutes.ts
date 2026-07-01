import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { OrderService } from '../services/OrderService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { MenuController } from '../controllers/MenuController.js';
import { MenuService } from '../services/MenuService.js';
import { MenuRepository } from '../repositories/MenuRepository.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { updateOrderStatusSchema } from '../validators/order.schema.js';
import { createMenuItemSchema, updateMenuItemSchema } from '../validators/menu.schema.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();

// Instantiate dependencies
const orderRepository = new OrderRepository();
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);

const menuRepository = new MenuRepository();
const menuService = new MenuService(menuRepository);
const menuController = new MenuController(menuService);

// Apply auth middleware to all routes in this router
router.use(authenticateToken);

// Order admin endpoints
router.get('/orders', asyncErrorWrapper((req, res) => orderController.getAllOrders(req, res)));
router.patch('/orders/:id/status', validateBody(updateOrderStatusSchema), asyncErrorWrapper((req, res) => orderController.updateOrderStatus(req, res)));

// Menu admin endpoints
router.get('/menu', asyncErrorWrapper((req, res) => menuController.getAdminMenu(req, res)));
router.post('/menu', validateBody(createMenuItemSchema), asyncErrorWrapper((req, res) => menuController.addMenuItem(req, res)));
router.put('/menu/:id', validateBody(updateMenuItemSchema), asyncErrorWrapper((req, res) => menuController.editMenuItem(req, res)));
router.delete('/menu/:id', asyncErrorWrapper((req, res) => menuController.deleteMenuItem(req, res)));

export default router;
