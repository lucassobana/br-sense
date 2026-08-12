import axios from "axios";
import type { Farm, Probe, RequestLog } from "../types";
import { refreshTokenKeycloak } from "./auth";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const tokens = await refreshTokenKeycloak(refreshToken);

          localStorage.setItem("access_token", tokens.access_token);
          localStorage.setItem("refresh_token", tokens.refresh_token);

          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`;

          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export interface User {
  id: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ReadingHistory {
  timestamp: string;
  depth_cm: number | null;
  moisture_pct: number | null;
  temperature_c: number | null;
  rain_cm?: number | null;
  battery_status?: number | null;
  solar_status?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  reading_type?: string | null;
}

export interface CreateFarmDTO {
  name: string;
  location: string;
  user_id?: number;
}

export interface CreateDeviceDTO {
  name: string;
  esn: string;
  farm_id: number;
  latitude?: number;
  longitude?: number;
  config_moisture_v1?: number;
  config_moisture_v2?: number;
  config_moisture_v3?: number;
  config_gradient_intensity?: number;
}

interface HistoryParams {
  limit?: number;
  start_date?: string;
  end_date?: string;
}

export interface DeviceConfigUpdateDTO {
  v1: number;
  v2: number;
  v3: number;
  intensity: number;
}

export interface GetUsersResponse {
  status: string;
  users: User[];
}

export interface DecisionCardData {
  talhao_info: string;
  status: "Normal" | "Atenção" | "Crítico";
  zona_ativa_raiz: string;
  tendencia_umidade: "subindo" | "estável" | "caindo";
  ultima_irrigacao_chuva: string;
  previsao_chuva: string;
  risco_estresse: "baixo" | "moderado" | "alto";
  sugestao: string;
  observacao: string;
}

// --- Funções de Dados (Dashboard) ---

export const getProbes = async () => {
  const response = await api.get<Probe[]>("/api/devices");
  return response.data;
};

export const getFarms = async () => {
  const response = await api.get<Farm[]>("/api/farms");
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get<GetUsersResponse>("/api/users");
  return response.data;
};

export const getDeviceAnalysis = async (
  esn: string,
): Promise<DecisionCardData> => {
  const response = await api.get(`/api/devices/${esn}/analysis`);
  return response.data;
};

// --- Funções de Ação ---

export const createFarm = async (data: CreateFarmDTO) => {
  const response = await api.post("/api/farms", data);
  return response.data;
};

export const createDevice = async (data: CreateDeviceDTO) => {
  const response = await api.post("/api/devices", data);
  return response.data;
};

// --- Funções de Histórico e Logs ---

export const getLogs = async () => {
  const response = await api.get<RequestLog[]>("/api/requests");
  return response.data;
};

export const getDeviceHistory = async (esn: string, params?: HistoryParams) => {
  const response = await api.get<ReadingHistory[]>(
    `/api/device/${esn}/history`,
    { params },
  );
  return response.data;
};

// --- Funções Específicas (Admin ou Legado) ---

export const getUserFarms = async () => {
  const response = await api.get<import("../types").Farm[]>("/api/farms");
  return response.data;
};

export const updateFarm = async (
  farmId: number,
  data: Partial<CreateFarmDTO & { user_id: number }>,
) => {
  const response = await api.patch(`/api/farms/${farmId}`, data);
  return response.data;
};

export const updateDeviceAdmin = async (
  esn: string,
  data: Partial<CreateDeviceDTO & { cultura: string; data_plantio: string }>,
) => {
  const response = await api.patch(`/api/devices/${esn}`, data);
  return response.data;
};

export const updateDeviceConfig = async (
  esn: string,
  config: DeviceConfigUpdateDTO,
) => {
  const response = await api.patch(`/api/devices/${esn}`, {
    config_moisture_v1: config.v1,
    config_moisture_v2: config.v2,
    config_moisture_v3: config.v3,
    config_gradient_intensity: config.intensity,
  });
  return response.data;
};
