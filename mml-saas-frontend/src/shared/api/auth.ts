import { apiClient } from './client';
import type { ProfileResponse } from './users';

// --- Requests ---

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerifyRequest {
  email: string;
  code: string;
}

export interface PasswordResetCompleteRequest {
  email: string;
  code: string;
  password: string;
  confirm_password: string;
}

// --- Responses ---

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  status: string;
}

export interface AuthResponse {
  access_token: string;
  expires_at: string;
  user: UserResponse;
}

export interface MeResponse {
  id: number;
  email: string;
  name: string;
  status: string;
  verification_cooldown: number;
}

export interface MessageResponse {
  message: string;
}

// --- API ---

const AUTH = '/api/v1/auth';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>(`${AUTH}/register`, data).then((r) => r.data),

  verifyEmail: (data: VerifyEmailRequest) =>
    apiClient
      .post<AuthResponse>(`${AUTH}/verify-email`, data)
      .then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>(`${AUTH}/login`, data).then((r) => r.data),

  logout: () => apiClient.post(`${AUTH}/logout`).then((r) => r.data),

  refresh: () =>
    apiClient.post<AuthResponse>(`${AUTH}/refresh`).then((r) => r.data),

  resendVerification: (data: ResendVerificationRequest) =>
    apiClient
      .post<MessageResponse>(`${AUTH}/resend-verification`, data)
      .then((r) => r.data),

  passwordReset: (data: PasswordResetRequest) =>
    apiClient
      .post<MessageResponse>(`${AUTH}/password-reset`, data)
      .then((r) => r.data),

  passwordResetVerify: (data: PasswordResetVerifyRequest) =>
    apiClient
      .post<MessageResponse>(`${AUTH}/password-reset/verify`, data)
      .then((r) => r.data),

  passwordResetComplete: (data: PasswordResetCompleteRequest) =>
    apiClient
      .post<AuthResponse>(`${AUTH}/password-reset/complete`, data)
      .then((r) => r.data),

  getMe: () =>
    apiClient.get<ProfileResponse>('/api/v1/users/me').then((r) => r.data),
};
