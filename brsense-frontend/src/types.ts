export interface Measurement {
  id?: number;
  depth_cm: number;
  moisture_pct: number | null;
  temperature_c?: number | null;
  battery_status?: number | null;
  solar_status?: number | null;
  rain_cm?: number | null;
  timestamp: string;

  value?: number;
  sensor_index?: number;
}

export interface Probe {
  id: number;
  esn: string;
  name: string;
  location: string;
  status: string;
  last_communication: string;
  readings: Measurement[];

  measurements?: Measurement[];
  position?: [number, number];
  farm_id?: number;
  latitude?: number;
  longitude?: number;
  config_moisture_min?: number;
  config_moisture_max?: number;

  rain_1h?: number;
  rain_24h?: number;
  rain_7d?: number;
}

export interface Farm {
  id: number;
  name: string;
  location: string;
  user_id: number;
}

export interface RequestLog {
  id: number;
  timestamp: string;
  client_ip: string;
  status: string;
  log_message: string;
}