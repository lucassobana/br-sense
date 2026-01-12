export interface Measurement {
  id?: number;
  depth_cm: number;
  moisture_pct: number;
  temperature_c?: number;
  timestamp: string;

  // --- Adicione estes campos opcionais para compatibilidade com código antigo ---
  value?: number;        // O código antigo chamava moisture_pct de value
  sensor_index?: number; // O código antigo usava index
}

export interface Probe {
  id: number;
  esn: string;
  name: string;
  location: string;
  status: string;
  last_communication: string;

  readings: Measurement[];

  // --- Adicione estes campos opcionais ---
  measurements?: Measurement[]; // O código antigo procura por isso
  position?: [number, number];  // O mapa antigo procura por isso

  farm_id?: number;
  latitude?: number;
  longitude?: number;
}

// ... (Resto do arquivo Farm, etc)

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