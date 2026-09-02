import { Router } from 'express';
import { OrderController } from '../controllers/OrderController.js';
import { OrderService } from '../services/OrderService.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { MenuController } from '../controllers/MenuController.js';
import { MenuService } from '../services/MenuService.js';
import { MenuRepository } from '../repositories/MenuRepository.js';
import { AdminController } from '../controllers/AdminController.js';
import { AdminService } from '../services/AdminService.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
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

const adminService = new AdminService();
const adminController = new AdminController(adminService);

// Apply base authentication to all admin router routes
router.use(authenticateToken);

// ==============================================================================
// 1. Super Admin Executive Command Center Endpoints (Strictly 'admin' Role)
// ==============================================================================
router.get(
  '/overview', 
  requireRole(['admin']), 
  asyncErrorWrapper((req, res) => adminController.getOverview(req, res))
);

router.get(
  '/orders-global', 
  requireRole(['admin']), 
  asyncErrorWrapper((req, res) => adminController.getAllOrdersGlobal(req, res))
);

router.get(
  '/staff', 
  requireRole(['admin']), 
  asyncErrorWrapper((req, res) => adminController.getStaffList(req, res))
);

router.post(
  '/staff', 
  requireRole(['admin']), 
  asyncErrorWrapper((req, res) => adminController.createStaffUser(req, res))
);

router.patch(
  '/staff/:id', 
  requireRole(['admin']), 
  asyncErrorWrapper((req, res) => adminController.updateStaffCredentials(req, res))
);

// ==============================================================================
// 2. Order Processing Endpoints (Admin, Store Managers, Cooks & Delivery)
// ==============================================================================
router.get(
  '/orders', 
  requireRole(['admin', 'manager', 'cook', 'delivery']), 
  asyncErrorWrapper((req, res) => orderController.getAllOrders(req, res))
);

router.patch(
  '/orders/:id/status', 
  requireRole(['admin', 'manager', 'cook', 'delivery']), 
  validateBody(updateOrderStatusSchema), 
  asyncErrorWrapper((req, res) => orderController.updateOrderStatus(req, res))
);

// ==============================================================================
// 3. Menu Management Endpoints (Admin & Store Managers)
// ==============================================================================
router.get(
  '/menu', 
  requireRole(['admin', 'manager']), 
  asyncErrorWrapper((req, res) => menuController.getAdminMenu(req, res))
);

router.post(
  '/menu', 
  requireRole(['admin', 'manager']), 
  validateBody(createMenuItemSchema), 
  asyncErrorWrapper((req, res) => menuController.addMenuItem(req, res))
);

router.put(
  '/menu/:id', 
  requireRole(['admin', 'manager']), 
  validateBody(updateMenuItemSchema), 
  asyncErrorWrapper((req, res) => menuController.editMenuItem(req, res))
);

router.delete(
  '/menu/:id', 
  requireRole(['admin', 'manager']), 
  asyncErrorWrapper((req, res) => menuController.deleteMenuItem(req, res))
);

export default router;
