// Backend API response type
export interface AppFromAPI {
  id: string; // UUID from backend
  name: string;
  created_on: string; // ISO datetime string
  updated_on: string; // ISO datetime string
  deployment_port: number | null; // Port where the app is deployed
}

// Frontend app type with computed UI properties
export interface App extends AppFromAPI {
  // Computed/derived properties for UI
  color: string;
  lastModified: string; // Human-readable format
}

// App Agent Session types
export interface AppAgentSessionFromAPI {
  id: string; // UUID from backend
  app_id: string; // UUID from backend
  version: number;
  status: "active" | "stopped";
  created_on: string; // ISO datetime string
  app_port: number;
  port: number;
  container_id: string;
}

// API request types
export interface CreateAppRequest {
  name: string;
}

export interface Connection {
  id: string;
  name: string;
  connection_type: string;
}

export interface SnowflakeConnectionCreate {
  name: string;
  account: string;
  user: string;
  role: string;
  database: string;
  warehouse: string;
  schema: string;
  private_key: string;
}
