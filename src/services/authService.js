import { backendAdapter } from '../config/backend';

export const authService = {
  async getMe() {
    return await backendAdapter.getMe();
  },
  async logout(shouldRedirect = true, redirectUrl = window.location.href) {
    return await backendAdapter.logout(shouldRedirect, redirectUrl);
  },
  async redirectToLogin(redirectUrl = window.location.href) {
    return await backendAdapter.redirectToLogin(redirectUrl);
  },
  async getAppPublicSettings(appId) {
    return await backendAdapter.getAppPublicSettings(appId);
  }
};
