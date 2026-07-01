import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { MenuService } from '../services/MenuService.js';

export class MenuController extends BaseController {
  constructor(private readonly menuService: MenuService) {
    super();
  }

  async getPublicMenu(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.menuService.getPublicMenu();
      this.handleSuccess(res, items);
    } catch (error) {
      this.handleError(error, res, 'getPublicMenu');
    }
  }

  async getAdminMenu(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.menuService.getAdminMenu();
      this.handleSuccess(res, items);
    } catch (error) {
      this.handleError(error, res, 'getAdminMenu');
    }
  }

  async addMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const newItem = await this.menuService.addMenuItem(req.body);
      this.handleSuccess(res, newItem, 201);
    } catch (error) {
      this.handleError(error, res, 'addMenuItem');
    }
  }

  async editMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updatedItem = await this.menuService.editMenuItem(id, req.body);
      this.handleSuccess(res, updatedItem);
    } catch (error) {
      this.handleError(error, res, 'editMenuItem');
    }
  }

  async deleteMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.menuService.deleteMenuItem(id);
      this.handleSuccess(res, { success: true, message: 'Item deleted' });
    } catch (error) {
      this.handleError(error, res, 'deleteMenuItem');
    }
  }
}
