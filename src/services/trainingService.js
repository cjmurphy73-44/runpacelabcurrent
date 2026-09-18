/**
 * Training Service Layer
 * Consumes the active backend adapter for training plan CRUD operations.
 */
import { backendAdapter } from './backend';

export const trainingService = {
  async getTrainingPlans(params) {
    try {
      return await backendAdapter.getTrainingPlans(params);
    } catch (err) {
      console.error('[trainingService] getTrainingPlans error:', err);
      return [];
    }
  },

  async createTrainingPlan(data) {
    try {
      return await backendAdapter.createTrainingPlan(data);
    } catch (err) {
      console.error('[trainingService] createTrainingPlan error:', err);
      throw err;
    }
  },

  async updateTrainingPlan(id, data) {
    try {
      if (backendAdapter.updateTrainingPlan) {
        return await backendAdapter.updateTrainingPlan(id, data);
      }
      return data;
    } catch (err) {
      console.error('[trainingService] updateTrainingPlan error:', err);
      throw err;
    }
  },

  async deleteTrainingPlan(id) {
    try {
      if (backendAdapter.deleteTrainingPlan) {
        return await backendAdapter.deleteTrainingPlan(id);
      }
      return true;
    } catch (err) {
      console.error('[trainingService] deleteTrainingPlan error:', err);
      throw err;
    }
  }
};
