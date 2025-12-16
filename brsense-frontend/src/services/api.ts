// brsense-frontend/src/services/api.ts
import axios from 'axios';

// Configuração do Axios
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

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
  // Pega ID e Role do localStorage
  const userId = localStorage.getItem('user_id');
  const role = localStorage.getItem('user_role');

  let url = '/api/devices';

  // REGRA DE NEGÓCIO: 
  // Se NÃO for admin e tiver um ID, filtra pelo usuário.
  if (role !== 'ADMIN' && userId) {
    url += `?user_id=${userId}`;
  }

  const response = await api.get<import('../types').Probe[]>(url);
  return response.data;
};

export const getFarms = async () => {
  const userId = localStorage.getItem('user_id');
  const role = localStorage.getItem('user_role');

  let url = '/api/farms';

  // Mesma regra para fazendas
  if (role !== 'ADMIN' && userId) {
    url += `?user_id=${userId}`;
  }

  const response = await api.get<import('../types').Farm[]>(url);
  return response.data;
};

export const getLogs = async () => {
  const response = await api.get<import('../types').RequestLog[]>('/api/requests');
  return response.data;
};

export const getDeviceHistory = async (esn: string) => {
  const response = await api.get<ReadingHistory[]>(`/api/device/${esn}/history`);
  return response.data;
};