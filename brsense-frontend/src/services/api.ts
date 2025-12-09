import axios from 'axios';

// Configuração do Axios
export const api = axios.create({
  baseURL: 'http://localhost:8000', // URL do seu FastAPI
});

// --- Interfaces de Resposta (Tipagem) ---
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

// --- Funções de Autenticação ---

export const login = async (email: string, password: string) => {
  // Importante: O backend espera o campo "login", mas o frontend coleta "email".
  // Enviamos { login: email, password } para bater com o LoginSchema do Python.
  const response = await api.post<AuthResponse>('/api/login', {
    login: email, 
    password: password
  });
  return response.data;
};

// --- Funções de Dados (Dashboard) ---

export const getProbes = async () => {
  // Assegure-se de que o arquivo types.ts exista em ../types
  const response = await api.get<import('../types').Probe[]>('/api/probes');
  return response.data;
};

export const getLogs = async () => {
  const response = await api.get<import('../types').RequestLog[]>('/api/requests');
  return response.data;
};