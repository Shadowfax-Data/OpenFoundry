// Backend API response type
export interface AppFromAPI {
  id: string; // UUID from backend
  name: string;
  created_on: string; // ISO datetime string
  updated_on: string; // ISO datetime string
  deleted_on: string | null; // ISO datetime string
  deployment_port: number | null; // Port where the app is deployed
  connections: ConnectionFromAPI[]; // List of connected connections
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
  type: string;
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
  type: string;
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
  type: string;
}

export interface ClickhouseConnectionCreate {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface ClickhouseConnectionUpdate {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface ClickhouseConnectionModel {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  type: string;
}

export interface BigQueryConnectionCreate {
  name: string;
  service_account_key: string;
  project_id: string;
}

export interface BigQueryConnectionUpdate {
  name?: string;
  service_account_key?: string;
  project_id?: string;
}

export interface BigQueryConnectionModel {
  id: string;
  name: string;
  service_account_key: string;
  project_id: string;
  type: string;
}
export interface PostgresConnectionModel {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema: string;
  type: string;
}

export interface PostgresConnectionCreate {
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema: string;
}

export interface PostgresConnectionUpdate {
  name?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  schema?: string;
}
