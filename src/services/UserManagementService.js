import { Permissions, Roles } from '../auth/permissions';
import { authorizationService } from './AuthorizationService';
import { excelRepository } from '../repositories/ExcelRepository';

const validRoles = Object.values(Roles);

export class UserManagementService {
  constructor({ repository = excelRepository, authorization = authorizationService } = {}) {
    this.repository = repository;
    this.authorization = authorization;
  }

  async listUsers() {
    this.authorization.requirePermission(Permissions.VIEW_USERS);
    return this.repository.listUsers();
  }

  async createUser({ name, username, password, role, isActive }) {
    this.authorization.requirePermission(Permissions.CREATE_USER);
    const cleanName = name?.trim();
    const cleanUsername = username?.trim();
    if (!cleanName || !cleanUsername || !password || !validRoles.includes(role)) {
      throw new Error('Name, username, password, and a valid role are required.');
    }

    const existingUser = await this.repository.findUserByUsername(cleanUsername);
    if (existingUser) throw new Error('That username is already in use.');

    const users = await this.repository.listUsers();
    const nextId = String(Math.max(0, ...users.map((user) => Number(user.id) || 0)) + 1);
    return this.repository.createUser({
      id: nextId,
      name: cleanName,
      username: cleanUsername,
      password,
      role,
      isActive: Boolean(isActive),
      createdAt: new Date().toISOString(),
    });
  }

  async setUserActive(id, isActive) {
    this.authorization.requirePermission(Permissions.MANAGE_USERS);
    return this.repository.updateUser(id, { isActive: Boolean(isActive) });
  }
}

export const userManagementService = new UserManagementService();
