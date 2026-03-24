import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if refresh is in progress to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
}

// Response interceptor - handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      const responseData = error.response.data as { code?: string };

      if (responseData?.code === 'TOKEN_EXPIRED') {
        if (isRefreshing) {
          // Queue the request while refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          processQueue(null, accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// API helper functions
export const authApi = {
  register: (data: { email: string; password: string; role: string; fullName: string; bio?: string; location?: string }) =>
    apiClient.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
  me: () => apiClient.get('/auth/me'),
};

export const usersApi = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data: { fullName?: string; bio?: string; location?: string; socialLinks?: object }) =>
    apiClient.put('/users/profile', data),
  uploadAvatar: (formData: FormData) =>
    apiClient.post('/users/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const listingsApi = {
  getAll: (params?: { page?: number; limit?: number; surgeryTypeId?: string; search?: string }) =>
    apiClient.get('/listings', { params }),
  getMy: () => apiClient.get('/listings/my'),
  getById: (id: string) => apiClient.get(`/listings/${id}`),
  create: (data: object) => apiClient.post('/listings', data),
  update: (id: string, data: object) => apiClient.put(`/listings/${id}`, data),
  payInsurance: (id: string) => apiClient.post(`/listings/${id}/pay-insurance`),
  fundedCheck: (id: string) => apiClient.post(`/listings/${id}/funded-check`),
  signAgreement: (id: string, data: { terms?: string }) =>
    apiClient.post(`/listings/${id}/agreement/sign`, data),
};

export const contributionsApi = {
  contribute: (listingId: string, amount: number) =>
    apiClient.post(`/contributions/${listingId}`, { amount }),
  getMy: () => apiClient.get('/contributions/my'),
  getForListing: (listingId: string) =>
    apiClient.get(`/contributions/listing/${listingId}`),
};

export const picturesApi = {
  upload: (listingId: string, formData: FormData) =>
    apiClient.post(`/pictures/listing/${listingId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getForListing: (listingId: string) =>
    apiClient.get(`/pictures/listing/${listingId}`),
  release: (listingId: string) =>
    apiClient.post(`/pictures/listing/${listingId}/release`),
  getViewUrl: (pictureId: string) => `/api/pictures/${pictureId}/view`,
};

export const adminApi = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getSurgeryTypes: () => apiClient.get('/admin/surgery-types'),
  createSurgeryType: (data: object) => apiClient.post('/admin/surgery-types', data),
  updateSurgeryType: (id: string, data: object) => apiClient.put(`/admin/surgery-types/${id}`, data),
  setListingAdminFee: (listingId: string, adminFeePercent: number) =>
    apiClient.put(`/admin/listings/${listingId}/admin-fee`, { adminFeePercent }),
  getAllListings: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/admin/listings', { params }),
  getAllUsers: (params?: { page?: number; limit?: number; role?: string }) =>
    apiClient.get('/admin/users', { params }),
  getSubscriptionTiers: () => apiClient.get('/admin/subscription-tiers'),
  createSubscriptionTier: (data: object) => apiClient.post('/admin/subscription-tiers', data),
  updateSubscriptionTier: (id: string, data: object) =>
    apiClient.put(`/admin/subscription-tiers/${id}`, data),
  handleInsuranceClaim: (listingId: string, reason?: string) =>
    apiClient.post(`/admin/listings/${listingId}/insurance-claim`, { reason }),
  getInsuranceFeeConfigs: () => apiClient.get('/admin/insurance-fee-configs'),
  createInsuranceFeeConfig: (data: object) => apiClient.post('/admin/insurance-fee-configs', data),
};

export const surgeonsApi = {
  getProfile: () => apiClient.get('/surgeons/profile'),
  updateProfile: (data: object) => apiClient.put('/surgeons/profile', data),
  subscribe: (tierId: string) => apiClient.post('/surgeons/subscribe', { tierId }),
  getSuggested: () => apiClient.get('/surgeons/suggested'),
  getListings: () => apiClient.get('/surgeons/listings'),
  signAgreement: (listingId: string, data: { consultationDocUrl?: string; terms?: string }) =>
    apiClient.post(`/surgeons/agreement/${listingId}/sign`, data),
};

export const surgeryTypesApi = {
  getAll: () => apiClient.get('/admin/surgery-types'),
};
