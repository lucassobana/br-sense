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

// Interface para o histórico de leituras (usada no gráfico)
export interface ReadingHistory {
  timestamp: string;
  depth_cm: number;
  moisture_pct: number;
  temperature_c: number;
}

// --- Funções de Autenticação ---

export const login = async (email: string, password: string) => {
  // Importante: O backend espera o campo "login", mas o frontend coleta "email".
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
  // Assegure-se de que o arquivo types.ts exista em ../types
  // Nota: Verifique se sua rota no backend é '/api/probes' ou '/api/devices'
  const response = await api.get<import('../types').Probe[]>('/api/devices'); 
  return response.data;
};

export const getLogs = async () => {
  const response = await api.get<import('../types').RequestLog[]>('/api/requests');
  return response.data;
};

// --- NOVA FUNÇÃO: Histórico para o Gráfico ---

export const getDeviceHistory = async (esn: string) => {
  // Busca o histórico de leituras para um ESN específico
  const response = await api.get<ReadingHistory[]>(`/api/device/${esn}/history`);
  return response.data;
};