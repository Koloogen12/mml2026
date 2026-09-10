import { apiClient } from './client';
import type { MessageResponse } from './auth';

// --- Requests ---

export interface UpdateProfileRequest {
  name: string;
  last_name?: string;
  phone?: string;
  company?: string;
  website?: string;
  country?: string;
  timezone?: string;
  avatar?: File;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// --- Responses ---

export interface ProfileResponse {
  id: number;
  email: string;
  name: string;
  last_name?: string;
  phone?: string;
  company?: string;
  website?: string;
  country?: string;
  timezone?: string;
  avatar_url?: string;
  status: string;
  verification_cooldown: number;
}

// --- API ---

const USERS = '/api/v1/users';

export const usersApi = {
  updateProfile: async (data: UpdateProfileRequest) => {
    const formData = new FormData();

    formData.append('name', data.name);
    if (data.last_name) formData.append('last_name', data.last_name);
    if (data.phone) formData.append('phone', data.phone);
    if (data.company) formData.append('company', data.company);
    if (data.website) formData.append('website', data.website);
    if (data.country) formData.append('country', data.country);
    if (data.timezone) formData.append('timezone', data.timezone);
    if (data.avatar) formData.append('avatar', data.avatar);

    const response = await apiClient.patch<ProfileResponse>(
      `${USERS}/me`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const response = await apiClient.post<MessageResponse>(
      `${USERS}/me/password`,
      data,
    );
    return response.data;
  },

  deleteAccount: async () => {
    const response = await apiClient.delete<MessageResponse>(`${USERS}/me`);
    return response.data;
  },
};
