import { hasPermissionForRole } from '../auth/permissions';

const SESSION_KEY = 'aegis-autopro-session-v1';

const getStorage = () =>
  typeof window === 'undefined' ? null : window.sessionStorage;

export class AuthorizationError extends Error {
  constructor(message = 'You are not authorized to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class AuthorizationService {
  constructor({ storage = getStorage() } = {}) {
    this.storage = storage;
  }

  setCurrentUser(user) {
    const sessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
    this.storage?.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  }

  getCurrentUser() {
    const session = this.storage?.getItem(SESSION_KEY);
    if (!session) return null;

    try {
      return JSON.parse(session);
    } catch {
      this.logout();
      return null;
    }
  }

  isAuthenticated() {
    const user = this.getCurrentUser();
    return Boolean(user?.isActive);
  }

  hasRole(role) {
    return this.getCurrentUser()?.role === role;
  }

  hasPermission(permission) {
    const user = this.getCurrentUser();
    return Boolean(
      user?.isActive && hasPermissionForRole(user.role, permission)
    );
  }

  requireAuthentication() {
    if (!this.isAuthenticated()) {
      throw new AuthorizationError('Please sign in to continue.');
    }
    return this.getCurrentUser();
  }

  requireRole(role) {
    const user = this.requireAuthentication();
    if (user.role !== role) throw new AuthorizationError();
    return user;
  }

  requirePermission(permission) {
    const user = this.requireAuthentication();
    if (!this.hasPermission(permission)) throw new AuthorizationError();
    return user;
  }

  logout() {
    this.storage?.removeItem(SESSION_KEY);
  }
}

export const authorizationService = new AuthorizationService();
