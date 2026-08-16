import { beforeEach, describe, expect, it } from 'vitest';
import { Permissions, Roles } from '../auth/permissions';
import { ExcelRepository } from '../repositories/ExcelRepository';
import { AuthService } from './AuthService';
import { AuthorizationService, authorizationService } from './AuthorizationService';
import { AdminSettingsService } from './AdminSettingsService';
import { EnvironmentService } from './EnvironmentService';
import { UserManagementService } from './UserManagementService';
import { postRequest } from './api';

class MemoryStorage {
  values = new Map();

  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

describe('temporary authentication and authorization', () => {
  let repository;
  let authorization;
  let auth;
  let users;
  let environments;
  let adminSettings;

  beforeEach(() => {
    repository = new ExcelRepository({ storage: new MemoryStorage() });
    authorization = new AuthorizationService({ storage: new MemoryStorage() });
    authorizationService.storage = authorization.storage;
    auth = new AuthService({ repository, authorization });
    users = new UserManagementService({ repository, authorization });
    environments = new EnvironmentService({ repository, authorization });
    adminSettings = new AdminSettingsService({ repository, authorization });
  });

  it.each([
    ['admin', 'admin123', Roles.ADMIN],
    ['tester', 'tester123', Roles.TESTER],
    ['enduser', 'user123', Roles.END_USER],
  ])('signs in the seeded %s account', async (username, password, role) => {
    const user = await auth.login(username, password);
    expect(user).toMatchObject({ username, role, isActive: true });
    expect(user).not.toHaveProperty('password');
    expect(authorization.isAuthenticated()).toBe(true);
  });

  it('rejects an invalid username, password, and inactive user', async () => {
    await expect(auth.login('unknown', 'password')).rejects.toThrow('Invalid username or password.');
    await expect(auth.login('admin', 'incorrect')).rejects.toThrow('Invalid username or password.');
    await repository.updateUser('3', { isActive: false });
    await expect(auth.login('enduser', 'user123')).rejects.toThrow('inactive');
  });

  it('allows an admin to create every role and manage environments', async () => {
    await auth.login('admin', 'admin123');
    await users.createUser({ name: 'Another Admin', username: 'admin2', password: 'password', role: Roles.ADMIN, isActive: true });
    await users.createUser({ name: 'Another Tester', username: 'tester2', password: 'password', role: Roles.TESTER, isActive: true });
    await users.createUser({ name: 'Another User', username: 'user2', password: 'password', role: Roles.END_USER, isActive: true });
    const environment = await environments.createEnvironment({ jurisdiction: 'AZ', name: 'Staging', description: 'Staging environment', status: 'ACTIVE' });
    expect((await environments.listEnvironmentOptions()).some((item) => item.id === environment.id)).toBe(true);
    await environments.updateEnvironment(environment.id, { status: 'INACTIVE' });
    expect((await users.listUsers())).toHaveLength(6);
    expect((await environments.listEnvironments()).find((item) => item.id === environment.id).status).toBe('INACTIVE');
    expect((await environments.listEnvironmentOptions()).some((item) => item.id === environment.id)).toBe(false);
    expect(authorization.hasPermission(Permissions.SYSTEM_STATUS)).toBe(true);
    expect(authorization.hasPermission(Permissions.TXE_INTERACTED_TIME)).toBe(true);
  });

  it('allows a tester to view environments and operational actions but not administration', async () => {
    await auth.login('tester', 'tester123');
    expect(await environments.listEnvironments()).toHaveLength(10);
    expect(authorization.hasPermission(Permissions.SYSTEM_STATUS)).toBe(true);
    expect(authorization.hasPermission(Permissions.TXE_INTERACTED_TIME)).toBe(true);
    expect(authorization.hasPermission(Permissions.RUN_SYSTEM_OPERATIONS)).toBe(true);
    await expect(users.createUser({})).rejects.toThrow('not authorized');
    await expect(environments.createEnvironment({})).rejects.toThrow('not authorized');
    expect(() => authorization.requirePermission(Permissions.ADMIN_SETTINGS)).toThrow('not authorized');
  });

  it('limits an end user to System Status and TXE Interacted Time', async () => {
    await auth.login('enduser', 'user123');
    expect(await environments.listEnvironmentOptions()).toHaveLength(8);
    expect(authorization.hasPermission(Permissions.SYSTEM_STATUS)).toBe(true);
    expect(authorization.hasPermission(Permissions.TXE_INTERACTED_TIME)).toBe(true);
    expect(authorization.hasPermission(Permissions.RUN_SYSTEM_OPERATIONS)).toBe(false);
    expect(authorization.hasPermission(Permissions.VIEW_USERS)).toBe(false);
    expect(authorization.hasPermission(Permissions.VIEW_ENVIRONMENTS)).toBe(false);
    expect(() => authorization.requirePermission(Permissions.CREATE_USER)).toThrow('not authorized');
  });

  it('enforces operation and admin-settings authorization in shared services', async () => {
    await auth.login('enduser', 'user123');
    expect(() => postRequest('/api/bring-up-system', {})).toThrow('not authorized');
    expect(() => postRequest('/api/unknown-operation', {})).toThrow('not configured');
    await expect(adminSettings.exportWorkbook()).rejects.toThrow('not authorized');
  });

  it('clears the session on logout and blocks protected actions', async () => {
    await auth.login('admin', 'admin123');
    auth.logout();
    expect(authorization.getCurrentUser()).toBeNull();
    expect(authorization.isAuthenticated()).toBe(false);
    expect(() => authorization.requireAuthentication()).toThrow('sign in');
  });
});
