import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { MenuService } from '../services/MenuService.js';

export class MenuController extends BaseController {
  constructor(private readonly menuService: MenuService) {
    super();
  }

  async getPublicMenu(req: Request, res: Response): Promise<void> {
    try {
      const canteenId = req.query.canteenId as string | undefined;
      const items = await this.menuService.getPublicMenu(canteenId);
      this.handleSuccess(res, items);
    } catch (error) {
      this.handleError(error, res, 'getPublicMenu');
    }
  }

  async getAdminMenu(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      let canteenId: string | undefined = req.query.canteenId as string | undefined;

      if (!canteenId && authUser && authUser.role !== 'admin') {
        canteenId = authUser.canteenId;
      }

      const items = await this.menuService.getAdminMenu(canteenId);
      this.handleSuccess(res, items);
    } catch (error) {
      this.handleError(error, res, 'getAdminMenu');
    }
  }

  async addMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      const body = { ...req.body };

      if (authUser) {
        if (authUser.role === 'cook') {
          const err = new Error('Cooks are not authorized to add menu items');
          (err as any).statusCode = 403;
          throw err;
        }
        if (!body.canteen_id) {
          body.canteen_id = authUser.canteenId;
        }
      }

      const newItem = await this.menuService.addMenuItem(body);
      this.handleSuccess(res, newItem, 201);
    } catch (error) {
      this.handleError(error, res, 'addMenuItem');
    }
  }

  async editMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authUser = (req as any).user;
      const body = { ...req.body };

      if (authUser) {
        if (authUser.role === 'cook') {
          const err = new Error('Cooks are not authorized to edit menu items');
          (err as any).statusCode = 403;
          throw err;
        }
        if (!body.canteen_id) {
          body.canteen_id = authUser.canteenId;
        }
      }

      const updatedItem = await this.menuService.editMenuItem(id, body, undefined);
      this.handleSuccess(res, updatedItem);
    } catch (error) {
      this.handleError(error, res, 'editMenuItem');
    }
  }

  async deleteMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const authUser = (req as any).user;

      if (authUser) {
        if (authUser.role === 'cook') {
          const err = new Error('Cooks are not authorized to delete menu items');
          (err as any).statusCode = 403;
          throw err;
        }
      }

      await this.menuService.deleteMenuItem(id, undefined);
      this.handleSuccess(res, { success: true, message: 'Item deleted' });
    } catch (error) {
      this.handleError(error, res, 'deleteMenuItem');
    }
  }
}
