import { Router } from 'express';
import { MenuController } from '../controllers/MenuController.js';
import { MenuService } from '../services/MenuService.js';
import { MenuRepository } from '../repositories/MenuRepository.js';
import { asyncErrorWrapper } from '../utils/asyncErrorWrapper.js';

const router = Router();
const menuRepository = new MenuRepository();
const menuService = new MenuService(menuRepository);
const menuController = new MenuController(menuService);

router.get('/', asyncErrorWrapper((req, res) => menuController.getPublicMenu(req, res)));

export default router;
