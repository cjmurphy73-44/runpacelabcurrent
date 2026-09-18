/**
 * Backend Adapter Factory
 * Routes calls to the appropriate implementation based on current configuration.
 */
import { VITE_BACKEND_MODE } from '../config/env';

const mockAdapter = {
  getTrainingPlans: async () => [],
  createTrainingPlan: async (data) => data,
  updateTrainingPlan: async (id, data) => data,
  deleteTrainingPlan: async (id) => true,
  getMe: async () => ({ id: 'mock-user', name: 'Mock User' }),
  logout: async () => { console.log('Mock logout'); },
  redirectToLogin: async () => { console.log('Mock redirect to login'); },
  getAppPublicSettings: async (appId) => ({ id: appId, public_settings: {} }),
};

const apiAdapter = {
  getTrainingPlans: async (params) => {
    // Implement actual API call here
    return [];
  },
  createTrainingPlan: async (data) => {
    // Implement actual API call here
    return data;
  },
  updateTrainingPlan: async (id, data) => {
    // Implement actual API call here
    return data;
  },
  deleteTrainingPlan: async (id) => {
    // Implement actual API call here
    return true;
  },
  getMe: async () => {
    // Implement actual API call here
    return {};
  },
  logout: async () => {
    // Implement actual API call here
  },
  redirectToLogin: async () => {
    // Implement actual API call here
  },
  getAppPublicSettings: async (appId) => {
    // Implement actual API call here
    return {};
  },
};

export const backendAdapter = VITE_BACKEND_MODE === 'production' ? apiAdapter : mockAdapter;
