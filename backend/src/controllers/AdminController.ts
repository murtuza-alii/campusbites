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
}
