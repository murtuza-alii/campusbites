import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AdminService } from '../services/AdminService.js';

export class AdminController extends BaseController {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.adminService.getOverview();
      this.handleSuccess(res, metrics);
    } catch (error) {
      this.handleError(error, res, 'getOverview');
    }
  }

  async getAllOrdersGlobal(req: Request, res: Response): Promise<void> {
    try {
      const { status, canteenId, search, limit, offset } = req.query;
      const result = await this.adminService.getAllOrdersGlobal({
        status: status as string,
        canteenId: canteenId as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0
      });
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'getAllOrdersGlobal');
    }
  }

  async getStaffList(req: Request, res: Response): Promise<void> {
    try {
      const staff = await this.adminService.getStaffList();
      this.handleSuccess(res, staff);
    } catch (error) {
      this.handleError(error, res, 'getStaffList');
    }
  }

  async createStaffUser(req: Request, res: Response): Promise<void> {
    try {
      const newStaff = await this.adminService.createStaffUser(req.body);
      this.handleSuccess(res, newStaff, 201);
    } catch (error) {
      this.handleError(error, res, 'createStaffUser');
    }
  }

  async updateStaffCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.adminService.updateStaffCredentials(id, req.body);
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, 'updateStaffCredentials');
    }
  }

  async getSalesAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const authUser = (req as any).user;
      let targetCanteenId = req.query.canteenId as string | undefined;

      // For store managers, strictly restrict sales data to their assigned outlet
      if (authUser && authUser.role !== 'admin') {
        if (!authUser.canteenId) {
          res.status(403).json({ error: 'Unauthorized: No canteen assigned to this store manager' });
          return;
        }
        targetCanteenId = authUser.canteenId;
      }

      const { month, status, search, limit, offset } = req.query;

      const salesData = await this.adminService.getMonthlySalesAnalytics({
        canteenId: targetCanteenId,
        month: month as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : 250,
        offset: offset ? parseInt(offset as string, 10) : 0
      });

      this.handleSuccess(res, salesData);
    } catch (error) {
      this.handleError(error, res, 'getSalesAnalytics');
    }
  }
}
