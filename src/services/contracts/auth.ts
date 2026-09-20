export interface AuthService {
  me(): Promise<any>;
  isAuthenticated(): Promise<boolean>;
  login(credentials: Record<string, any>): Promise<any>;
  logout(): Promise<void>;
  register(credentials: Record<string, any>): Promise<any>;
  verifyOtp(payload: Record<string, any>): Promise<any>;
  resetPassword(payload: Record<string, any>): Promise<any>;
  inviteUser(payload: Record<string, any>): Promise<any>;
}
