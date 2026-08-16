import axios from 'axios';
import { getOperationPermission } from '../auth/permissions';
import { AuthorizationError, authorizationService } from './AuthorizationService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: API_BASE_URL });

export const requireOperationPermission = (endpoint) => {
  const permission = getOperationPermission(endpoint);
  if (!permission) {
    throw new AuthorizationError('This system operation is not configured.');
  }
  return authorizationService.requirePermission(permission);
};

export const getRequest = (endpoint, params) => {
  requireOperationPermission(endpoint);
  return api.get(endpoint, { params });
};

export const postRequest = (endpoint, payload) => {
  requireOperationPermission(endpoint);
  return api.post(endpoint, payload);
};

export default api;
