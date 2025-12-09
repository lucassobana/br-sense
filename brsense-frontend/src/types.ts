export interface Measurement {
  id: number;
  sensor_index: number;
  value: number;
  timestamp: string;
}

export interface Probe {
  id: number;
  identifier: string; // ESN
  name: string;
  location: string;
  status: string;
  last_communication: string;
  measurements: Measurement[];
}

export interface RequestLog {
  id: number;
  timestamp: string;
  client_ip: string;
  status: string;
  log_message: string;
}