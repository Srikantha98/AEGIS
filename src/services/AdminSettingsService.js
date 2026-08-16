import { Permissions } from '../auth/permissions';
import { excelRepository } from '../repositories/ExcelRepository';
import { authorizationService } from './AuthorizationService';

export class AdminSettingsService {
  constructor({ repository = excelRepository, authorization = authorizationService } = {}) {
    this.repository = repository;
    this.authorization = authorization;
  }

  async exportWorkbook() {
    this.authorization.requirePermission(Permissions.ADMIN_SETTINGS);
    return this.repository.exportWorkbook();
  }
}

export const adminSettingsService = new AdminSettingsService();
