import { backendAdapter } from '../config/backend';

export const authService = {
  async getMe() {
    return await backendAdapter.getMe();
  },
  async logout() {
    return await backendAdapter.logout();
  },
  async redirectToLogin() {
    return await backendAdapter.redirectToLogin();
  },
  async getAppPublicSettings(appId) {
    return await backendAdapter.getAppPublicSettings(appId);
  }
};
