import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { AuthService } from '../services/AuthService.js';
import { validateBody } from '../middleware/validationMiddleware.js';
import { loginSchema } from '../validators/auth.schema.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();
const authService = new AuthService();
const authController = new AuthController(authService);

router.post('/login', validateBody(loginSchema), asyncErrorWrapper((req, res) => authController.login(req, res)));

export default router;
