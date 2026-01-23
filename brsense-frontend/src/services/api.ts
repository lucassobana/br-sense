// brsense-frontend/src/services/api.ts
import axios from 'axios';
import type { Farm, Probe, RequestLog } from '../types';

// Configuração do Axios
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use(
  async (config) => {
    // Busca o token salvo manualmente pelo Login.tsx no LocalStorage
    const token = localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Interfaces de DTO ---

export interface ReadingHistory {
  timestamp: string;
  depth_cm: number;
  moisture_pct: number;
  temperature_c: number;
}

export interface CreateFarmDTO {
  name: string;
  location: string;
}

export interface CreateDeviceDTO {
  name: string;
  esn: string;
  farm_id: number;
  // ADICIONADO: Campos opcionais de localização
  latitude?: number;
  longitude?: number;
}

interface HistoryParams {
  limit?: number;
  start_date?: string;
  end_date?: string;
}

// Nota: AuthResponse e CreateUserDTO foram removidos pois 
// o login e criação de usuários agora são gerenciados pelo Keycloak.

// --- Funções de Dados (Dashboard) ---

export const getProbes = async () => {
  // O backend agora filtra automaticamente as probes baseadas no Token do usuário
  // Se for ADMIN, o backend decide se retorna tudo ou filtra.
  const response = await api.get<Probe[]>('/api/devices');
  return response.data;
};

export const getFarms = async () => {
  // O backend identifica o usuário pelo Token Bearer e retorna apenas as fazendas dele
  const response = await api.get<Farm[]>('/api/farms');
  return response.data;
};

// --- Funções de Ação ---

export const createFarm = async (data: CreateFarmDTO) => {
  // NÃO enviamos mais user_id. O backend pega do token.
  const response = await api.post('/api/farms', data);
  return response.data;
};

export const createDevice = async (data: CreateDeviceDTO) => {
  const response = await api.post('/api/devices', data);
  return response.data;
};

// --- Funções de Histórico e Logs ---

export const getLogs = async () => {
  const response = await api.get<RequestLog[]>('/api/requests');
  return response.data;
};

export const getDeviceHistory = async (esn: string, params?: HistoryParams) => {
  // Passamos o objeto { params } como segundo argumento do axios
  const response = await api.get<ReadingHistory[]>(`/api/device/${esn}/history`, { params });
  return response.data;
};

// --- Funções Específicas (Admin ou Legado) ---

// Esta função torna-se redundante se getFarms já traz as fazendas do usuário,
// mas mantive caso você queira um endpoint explícito ou para uso de Admin filtrando outro user.
export const getUserFarms = async () => {
  // Chama a rota padrão. O backend deve filtrar pelo usuário do token.
  const response = await api.get<import('../types').Farm[]>('/api/farms');
  return response.data;
};

export const updateDeviceConfig = async (esn: string, min: number, max: number) => {
  const response = await api.patch(`/api/devices/${esn}`, {
    config_moisture_min: min,
    config_moisture_max: max
  });
  return response.data;
};