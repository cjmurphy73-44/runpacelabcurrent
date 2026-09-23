export interface AuthService {
  me(): Promise<any>;
  isAuthenticated(): Promise<boolean>;
  loginViaEmailPassword(credentials: Record<string, any>): Promise<any>;
  loginWithProvider(provider: string, fromUrl?: string): Promise<any>;
  logout(): Promise<void>;
  register(credentials: Record<string, any>): Promise<any>;
  verifyOtp(payload: Record<string, any>): Promise<any>;
  resendOtp(email: string): Promise<any>;
  resetPasswordRequest(email: string): Promise<any>;
  resetPassword(payload: Record<string, any>): Promise<any>;
  inviteUser(payload: Record<string, any>): Promise<any>;
}
