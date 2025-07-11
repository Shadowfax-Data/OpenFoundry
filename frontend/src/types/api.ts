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
  connection_ids: string[];
}

// Backend API response type for connections
export interface ConnectionFromAPI {
  id: string;
  name: string;
  connection_type: string;
}

// Frontend connection type with computed UI properties
export interface Connection extends ConnectionFromAPI {
  // Computed/derived properties for UI
  color: string;
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

export interface SnowflakeConnectionUpdate {
  name?: string;
  account?: string;
  user?: string;
  role?: string;
  database?: string;
  warehouse?: string;
  schema?: string;
  private_key?: string;
}

export interface SnowflakeConnectionModel {
  id: string;
  name: string;
  account: string;
  user: string;
  role: string;
  database: string;
  warehouse: string;
  schema: string;
  connection_type: string;
  private_key: string;
}

export interface DatabricksConnectionCreate {
  name: string;
  host: string;
  http_path: string;
  access_token: string;
  database?: string;
  schema?: string;
}

export interface DatabricksConnectionUpdate {
  name?: string;
  host?: string;
  http_path?: string;
  access_token?: string;
  database?: string;
  schema?: string;
}

export interface DatabricksConnectionModel {
  id: string;
  name: string;
  host: string;
  http_path: string;
  access_token: string;
  database?: string;
  schema?: string;
  connection_type: string;
}
