import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Request interceptor: Attach Authorization Bearer token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Intercept 401, auto-refresh token, and retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Avoid infinite loop on auth endpoints
    if (
      originalRequest?.url?.includes('/api/auth/login') ||
      originalRequest?.url?.includes('/api/auth/register') ||
      originalRequest?.url?.includes('/api/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await getRefreshToken();
        if (!storedRefreshToken) {
          throw new Error('NO_REFRESH_TOKEN');
        }

        const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken: storedRefreshToken
        });

        const { accessToken: newAccessToken, refreshToken: newRotatedToken } =
          refreshResponse.data.data;

        await saveTokens(newAccessToken, newRotatedToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await clearTokens();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API Methods
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamId: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
}

export const authApi = {
  async register(fullName: string, email: string, password: string, inviteToken?: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/api/auth/register', {
      fullName,
      email,
      password,
      inviteToken
    });
    const { accessToken, refreshToken } = res.data.data;
    await saveTokens(accessToken, refreshToken);
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password
    });
    const { accessToken, refreshToken } = res.data.data;
    await saveTokens(accessToken, refreshToken);
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/api/auth/logout', { refreshToken });
      }
    } finally {
      await clearTokens();
    }
  },

  async logoutAll(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout-all');
    } finally {
      await clearTokens();
    }
  },

  async getMe(): Promise<{ success: boolean; data: AuthUser }> {
    const res = await apiClient.get<{ success: boolean; data: AuthUser }>('/api/auth/me');
    return res.data;
  }
};

// User & Notification Settings API
export interface UserSettingsResponse {
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  pushShiftChanges: boolean;
  pushSwapRequests: boolean;
  pushApprovals: boolean;
  updatedAt: string;
  serverTimestamp: string;
}

export const settingsApi = {
  async getSettings(): Promise<UserSettingsResponse> {
    const res = await apiClient.get<{ success: boolean; data: UserSettingsResponse }>('/api/settings');
    return res.data.data;
  },

  async updateSettings(settings: Partial<{
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
    pushShiftChanges: boolean;
    pushSwapRequests: boolean;
    pushApprovals: boolean;
  }>): Promise<UserSettingsResponse> {
    const res = await apiClient.patch<{ success: boolean; data: UserSettingsResponse }>('/api/settings', settings);
    return res.data.data;
  },

  async registerDeviceToken(token: string, platform?: 'android' | 'ios' | 'web'): Promise<void> {
    await apiClient.post('/api/devices/token', {
      token,
      platform: platform || 'android'
    });
  }
};

