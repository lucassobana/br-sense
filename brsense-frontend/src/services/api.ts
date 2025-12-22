// brsense-frontend/src/services/api.ts
import axios from 'axios';
import type { Farm, Probe, RequestLog } from '../types';

// Configuração do Axios
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// --- Interfaces de DTO (Data Transfer Objects) ---

export interface CreateUserDTO {
  name: string;
  login: string;
  password: string;
  role: 'ADMIN' | 'FAZENDEIRO' | 'PIVOZEIRO';
}

export interface AuthResponse {
  status: string;
  message?: string;
  user?: {
    id: number;
    name: string;
    login: string;
    role: string;
  };
}

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

export interface AssociateDeviceDTO {
  esn: string;
  farm_id: number;
  name?: string;
}

// --- Funções de Autenticação ---

export const login = async (email: string, password: string) => {
  const response = await api.post<AuthResponse>('/api/login', {
    login: email,
    password: password
  });
  return response.data;
};

export const createUser = async (userData: CreateUserDTO) => {
  const response = await api.post('/api/register', userData);
  return response.data;
};

// --- Funções de Dados (Dashboard) ---

export const getProbes = async () => {
  const userId = localStorage.getItem('user_id');
  const role = localStorage.getItem('user_role');

  let url = '/api/devices';

  // Se NÃO for admin e tiver um ID, filtra pelo usuário
  if (role !== 'ADMIN' && userId) {
    url += `?user_id=${userId}`;
  }

  const response = await api.get<Probe[]>(url);
  return response.data;
};

export const getFarms = async () => {
  const userId = localStorage.getItem('user_id');
  const role = localStorage.getItem('user_role');

  let url = '/api/farms';

  // Mesma regra para fazendas: filtra pelo usuário logado
  if (role !== 'ADMIN' && userId) {
    url += `?user_id=${userId}`;
  }

  const response = await api.get<Farm[]>(url);
  return response.data;
};

// --- NOVAS FUNÇÕES (Para suportar o fluxo de cadastro) ---

export const getUserFarms = async () => {
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  // Chama a nova rota exclusiva criada no backend
  const response = await api.get<import('../types').Farm[]>(`/api/farms/user/${userId}`);
  return response.data;
};

export const createFarm = async (data: CreateFarmDTO) => {
  // Pega o ID do usuário logado para vincular a fazenda a ele
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await api.post('/api/farms', {
    ...data,
    user_id: parseInt(userId) // Envia o ID do dono
  });
  return response.data;
};

export const associateDevice = async (data: AssociateDeviceDTO) => {
  // Chama a rota de associação criada no backend (devices.py)
  // Assume-se que a rota está em /api/devices/associate
  const response = await api.post('/api/devices/associate', data);
  return response.data;
};

// --- Funções de Histórico e Logs ---

export const getLogs = async () => {
  const response = await api.get<RequestLog[]>('/api/requests');
  return response.data;
};

export const getDeviceHistory = async (esn: string) => {
  const response = await api.get<ReadingHistory[]>(`/api/device/${esn}/history`);
  return response.data;
};

export const getUserProbes = async () => {
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await api.get<import('../types').Probe[]>(`/api/devices/user/${userId}`);
  return response.data;
};