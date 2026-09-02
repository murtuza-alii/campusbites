import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { MenuService } from '../services/MenuService.js';
import { getDb } from '../db.js';

export class MenuController extends BaseController {
  constructor(private readonly menuService: MenuService) {
    super();
  }

  async getPublicMenu(req: Request, res: Response): Promise<void> {
    try {
      res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
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
      const db = await getDb();
      const requestedCanteenId = req.query.canteenId as string | undefined;

      // For non-admin staff, restrict menu items to their campus group or assigned outlet
      if (authUser && authUser.role !== 'admin') {
        let allowedCanteenIds: string[] = [];

        if (authUser.canteenId) {
          const userCanteenRes = await db.query('SELECT * FROM canteen WHERE id = $1', [authUser.canteenId]);
          if (userCanteenRes.rows.length > 0) {
            const userCanteen = userCanteenRes.rows[0];
            if (userCanteen.group_name) {
              const sistersRes = await db.query('SELECT id FROM canteen WHERE group_name = $1', [userCanteen.group_name]);
              allowedCanteenIds = sistersRes.rows.map((r: any) => r.id);
            } else {
              allowedCanteenIds = [userCanteen.id];
            }
          }
        }

        if (allowedCanteenIds.length === 0 && authUser.canteenId) {
          allowedCanteenIds = [authUser.canteenId];
        }

        if (requestedCanteenId) {
          if (!allowedCanteenIds.includes(requestedCanteenId)) {
            res.status(403).json({ error: 'Unauthorized: Cross-campus menu access is strictly prohibited' });
            return;
          }
          const items = await this.menuService.getAdminMenu(requestedCanteenId);
          this.handleSuccess(res, items);
          return;
        } else {
          const items = await this.menuService.getAdminMenu(allowedCanteenIds);
          this.handleSuccess(res, items);
          return;
        }
      }

      // Admin has global multi-campus visibility
      const items = await this.menuService.getAdminMenu(requestedCanteenId);
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
        if (authUser.role === 'cook' || authUser.role === 'delivery') {
          const err = new Error('Cooks and delivery staff are not authorized to add menu items');
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
        if (authUser.role === 'cook' || authUser.role === 'delivery') {
          const err = new Error('Cooks and delivery staff are not authorized to edit menu items');
          (err as any).statusCode = 403;
          throw err;
        }
        if (!body.canteen_id) {
          body.canteen_id = authUser.canteenId;
        }
      }

      const restrictCanteenId = authUser && authUser.role !== 'admin' ? authUser.canteenId : undefined;
      const updatedItem = await this.menuService.editMenuItem(id, body, restrictCanteenId);
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
        if (authUser.role === 'cook' || authUser.role === 'delivery') {
          const err = new Error('Cooks and delivery staff are not authorized to delete menu items');
          (err as any).statusCode = 403;
          throw err;
        }
      }

      const restrictCanteenId = authUser && authUser.role !== 'admin' ? authUser.canteenId : undefined;
      await this.menuService.deleteMenuItem(id, restrictCanteenId);
      this.handleSuccess(res, { success: true, message: 'Item deleted' });
    } catch (error) {
      this.handleError(error, res, 'deleteMenuItem');
    }
  }
}
