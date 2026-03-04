import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { refreshTokenKeycloak } from './auth';
import type { Farm, Probe } from '../types';

export const api = axios.create({
  // Use o IP da sua máquina local para testar no emulador/celular físico
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.X:8000',
});

api.interceptors.request.use(
  async (config) => {
    // Busca o token do SecureStore (Assíncrono no mobile)
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (refreshToken) {
        try {
          const tokens = await refreshTokenKeycloak(refreshToken);
          await SecureStore.setItemAsync('access_token', tokens.access_token);
          await SecureStore.setItemAsync('refresh_token', tokens.refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          // No mobile, redirecionamos usando o Expo Router depois
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getProbes = async () => {
  const response = await api.get<Probe[]>('/api/devices');
  return response.data;
};

export const getFarms = async () => {
  const response = await api.get<Farm[]>('/api/farms');
  return response.data;
};

export const getDeviceHistory = async (esn: string, params?: { start_date?: string; end_date?: string; limit?: number }) => {
  const response = await api.get<any[]>(`/api/device/${esn}/history`, { params });
  return response.data;
};