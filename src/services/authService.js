import { base44AuthService } from '@/services/adapters/base44';

// src/lib/AuthContext.jsx is a platform-managed authentication file: the platform
// enforces that it imports base44 directly and blocks refactors that remove that
// import. It imports THIS module by name, so it must keep exporting `authService`
// with the legacy method names AuthContext expects (getMe, logout(shouldRedirect, url)).
//
// To preserve a single auth implementation across the codebase, this shim delegates
// every call to the Base44 service adapter (base44AuthService) and only translates
// the legacy signatures to the adapter's contract. No auth logic lives here.
export const authService = {
  getAppPublicSettings(appId) {
    return base44AuthService.getAppPublicSettings(appId);
  },
  getMe() {
    return base44AuthService.me();
  },
  logout(shouldRedirect, redirectUrl) {
    return base44AuthService.logout(shouldRedirect ? redirectUrl : undefined);
  },
  redirectToLogin(nextUrl) {
    return base44AuthService.redirectToLogin(nextUrl);
  },
};