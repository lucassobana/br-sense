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
  login?: string;
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
  cultura?: string;
  data_plantio?: string;
  potencia_cv?: number;
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
  const response = await api.get<Probe[]>("/api/devices", {
    params: { limit: 1000 },
  });
  return response.data;
};

export const getFarms = async () => {
  const response = await api.get<Farm[]>("/api/farms", {
    params: { limit: 1000 },
  });
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
  const response = await api.get<import("../types").Farm[]>("/api/farms", {
    params: { limit: 1000 },
  });
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
  data: Partial<CreateDeviceDTO & { cultura: string; data_plantio: string; potencia_cv: number }>,
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

// --- Funções de Sondas Manuais ---

export const getManualProbes = async (farmId: number) => {
  const response = await api.get<import("../types").ManualProbe[]>(`/api/manual-probes/farm/${farmId}`);
  return response.data;
};

export const createManualProbe = async (data: {
  farm_id: number;
  name: string;
  latitude: number;
  longitude: number;
  irrigation_value_mm: number;
  cultura?: string;
  data_plantio?: string;
  potencia_cv?: number;
}) => {
  const response = await api.post<import("../types").ManualProbe>("/api/manual-probes/", data);
  return response.data;
};

export const updateManualProbe = async (id: number, data: { name?: string; irrigation_value_mm?: number; cultura?: string; data_plantio?: string; potencia_cv?: number; farm_id?: number; latitude?: number; longitude?: number }) => {
  const response = await api.put<import("../types").ManualProbe>(`/api/manual-probes/${id}`, data);
  return response.data;
};

export const deleteManualProbe = async (id: number) => {
  const response = await api.delete(`/api/manual-probes/${id}`);
  return response.data;
};

export const getManualIrrigations = async (probeId: number) => {
  const response = await api.get<import("../types").ManualIrrigationRecord[]>(`/api/manual-probes/${probeId}/irrigations`);
  return response.data;
};

export const addManualIrrigation = async (probeId: number, data: { irrigation_value_mm: number; date: string }) => {
  const response = await api.post<import("../types").ManualIrrigationRecord>(`/api/manual-probes/${probeId}/irrigations`, data);
  return response.data;
};

export const updateManualIrrigation = async (id: number, data: { irrigation_value_mm?: number; date?: string }) => {
  const response = await api.put<import("../types").ManualIrrigationRecord>(`/api/manual-probes/irrigations/${id}`, data);
  return response.data;
};
export const deleteManualIrrigation = async (id: number) => {
  const response = await api.delete(`/api/manual-probes/irrigations/${id}`);
  return response.data;
};

export const getMapLayers = async (farmId: number) => {
  const response = await api.get<import("../types").MapLayer[]>(`/api/map-layers/farm/${farmId}`);
  return response.data;
};

export const uploadMapLayer = async (farmId: number, file: File, name?: string) => {
  const formData = new FormData();
  formData.append("file", file);
  if (name) formData.append("name", name);
  const response = await api.post<import("../types").MapLayer>(
    `/api/map-layers/farm/${farmId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export const deleteMapLayer = async (layerId: number) => {
  await api.delete(`/api/map-layers/${layerId}`);
};

export const saveMapLayersVisibility = async (
  layers: import("../types").MapLayerVisibilityItem[]
): Promise<import("../types").MapLayer[]> => {
  const response = await api.put<import("../types").MapLayer[]>(
    `/api/map-layers/visibility`,
    { layers }
  );
  return response.data;
};

// --- Funções de Áreas NDVI (vinculadas a Sondas no Banco de Dados) ---

export interface BackendNdviAreaResponse {
  id: string;
  db_id: number;
  device_id: number;
  device_esn?: string | null;
  device_name?: string | null;
  farm_id?: number | null;
  farmName: string;
  city: string;
  name: string;
  type: "pivo" | "talhao";
  crop: string;
  hectares: number;
  geometry: import("../modules/ndvi").AreaGeometry;
  source: "demo" | "kml" | "sistema" | "desenho";
  circle?: {
    center: [number, number];
    edge: [number, number];
    radiusM: number;
  } | null;
  created_at?: string;
}

export interface CreateNdviAreaDTO {
  device_id: number;
  name: string;
  type: "pivo" | "talhao";
  crop: string;
  hectares: number;
  geometry: import("../modules/ndvi").AreaGeometry;
  source: "desenho" | "kml" | "sistema";
  circle?: {
    center: [number, number];
    edge: [number, number];
    radiusM: number;
  };
}

const mapBackendNdviArea = (
  raw: BackendNdviAreaResponse,
): import("../modules/ndvi").NdviArea => ({
  id: raw.id,
  dbId: raw.db_id,
  deviceId: raw.device_id,
  deviceEsn: raw.device_esn ?? undefined,
  deviceName: raw.device_name ?? undefined,
  farmId: raw.farm_id ?? undefined,
  name: raw.name,
  farmName: raw.farmName,
  city: raw.city,
  type: raw.type,
  crop: raw.crop,
  hectares: Number(raw.hectares),
  geometry: raw.geometry,
  source: raw.source,
  circle: raw.circle ?? undefined,
});

export const getNdviAreas = async (
  deviceId?: number,
): Promise<import("../modules/ndvi").NdviArea[]> => {
  const response = await api.get<BackendNdviAreaResponse[]>("/api/ndvi-areas", {
    params: deviceId ? { device_id: deviceId } : undefined,
  });
  return response.data.map(mapBackendNdviArea);
};

export const createNdviAreasBatch = async (
  areas: CreateNdviAreaDTO[],
): Promise<import("../modules/ndvi").NdviArea[]> => {
  const response = await api.post<BackendNdviAreaResponse[]>(
    "/api/ndvi-areas/batch",
    { areas },
  );
  return response.data.map(mapBackendNdviArea);
};

export interface UpdateNdviAreaDTO {
  device_id?: number;
  name?: string;
  type?: "pivo" | "talhao";
  crop?: string;
  hectares?: number;
  geometry?: import("../modules/ndvi").AreaGeometry;
  circle?: {
    center: [number, number];
    edge: [number, number];
    radiusM: number;
  } | null;
}

export const updateNdviArea = async (
  areaId: string | number,
  data: UpdateNdviAreaDTO,
): Promise<import("../modules/ndvi").NdviArea> => {
  const response = await api.put<BackendNdviAreaResponse>(
    `/api/ndvi-areas/${areaId}`,
    data,
  );
  return mapBackendNdviArea(response.data);
};

export const deleteNdviArea = async (areaId: string | number): Promise<void> => {
  await api.delete(`/api/ndvi-areas/${areaId}`);
};

