import { Permissions } from '../auth/permissions';
import { authorizationService } from './AuthorizationService';
import { excelRepository } from '../repositories/ExcelRepository';
import { normaliseJurisdiction } from '../config/jurisdictionEnvironments';

export class EnvironmentService {
  constructor({ repository = excelRepository, authorization = authorizationService } = {}) {
    this.repository = repository;
    this.authorization = authorization;
  }

  async listEnvironments() {
    this.authorization.requirePermission(Permissions.VIEW_ENVIRONMENTS);
    return this.repository.listEnvironments();
  }

  async listEnvironmentOptions() {
    this.authorization.requirePermission(Permissions.VIEW_ENVIRONMENT_OPTIONS);
    const environments = await this.repository.listEnvironments();
    return environments.filter((environment) =>
      environment.status === 'ACTIVE' && environment.jurisdiction
    );
  }

  async createEnvironment({ jurisdiction, name, description, status }) {
    const user = this.authorization.requirePermission(Permissions.CREATE_ENVIRONMENT);
    const cleanJurisdiction = normaliseJurisdiction(jurisdiction);
    const cleanName = name?.trim();
    if (!cleanJurisdiction || !cleanName || !description?.trim() || !['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new Error('Jurisdiction, environment name, description, and status are required.');
    }
    const environments = await this.repository.listEnvironments();
    const duplicate = environments.some((environment) =>
      normaliseJurisdiction(environment.jurisdiction) === cleanJurisdiction &&
      String(environment.name).toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) {
      throw new Error('That environment is already configured for this jurisdiction.');
    }
    const nextId = String(
      Math.max(0, ...environments.map((environment) => Number(environment.id) || 0)) + 1
    );
    return this.repository.createEnvironment({
      id: nextId,
      jurisdiction: cleanJurisdiction,
      name: cleanName,
      description: description.trim(),
      status,
      createdBy: user.username,
      createdAt: new Date().toISOString(),
    });
  }

  async updateEnvironment(id, changes) {
    this.authorization.requirePermission(Permissions.MANAGE_ENVIRONMENTS);
    if (changes.status && !['ACTIVE', 'INACTIVE'].includes(changes.status)) {
      throw new Error('Environment status is invalid.');
    }
    if (changes.name !== undefined && !changes.name.trim()) {
      throw new Error('Environment name is required.');
    }
    if (changes.description !== undefined && !changes.description.trim()) {
      throw new Error('Environment description is required.');
    }
    if (changes.jurisdiction !== undefined && !normaliseJurisdiction(changes.jurisdiction)) {
      throw new Error('Jurisdiction is required.');
    }
    return this.repository.updateEnvironment(id, {
      ...changes,
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.description !== undefined ? { description: changes.description.trim() } : {}),
      ...(changes.jurisdiction !== undefined ? { jurisdiction: normaliseJurisdiction(changes.jurisdiction) } : {}),
    });
  }
}

export const environmentService = new EnvironmentService();
