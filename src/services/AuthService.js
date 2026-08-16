import { authorizationService } from './AuthorizationService';
import { excelRepository } from '../repositories/ExcelRepository';

export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthService {
  constructor({ repository = excelRepository, authorization = authorizationService } = {}) {
    this.repository = repository;
    this.authorization = authorization;
  }

  async login(username, password) {
    const cleanUsername = username?.trim();
    if (!cleanUsername || !password) {
      throw new AuthenticationError('Enter both username and password.');
    }

    const user = await this.repository.findUserByUsername(cleanUsername);
    if (!user) throw new AuthenticationError('Invalid username or password.');
    if (user.password !== password) {
      throw new AuthenticationError('Invalid username or password.');
    }
    if (!user.isActive) {
      throw new AuthenticationError('This user account is inactive.');
    }

    return this.authorization.setCurrentUser(user);
  }

  logout() {
    this.authorization.logout();
  }
}

export const authService = new AuthService();
