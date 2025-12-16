// brsense-frontend/src/types.ts

export interface Measurement {
  id: number;
  sensor_index: number;
  value: number;
  timestamp: string;
}

export interface Probe {
  id: number;
  esn: string;
  name: string;
  location: string;
  status: string;
  last_communication: string;
  measurements: Measurement[];
  farm_id?: number; // Opcional, caso queira vincular visualmente
}

// --- NOVO TIPO ---
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