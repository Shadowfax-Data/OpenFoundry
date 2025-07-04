// Backend API response type
export interface AppFromAPI {
  id: string; // UUID from backend
  name: string;
  created_on: string; // ISO datetime string
  updated_on: string; // ISO datetime string
}

// Frontend app type with computed UI properties
export interface App extends AppFromAPI {
  // Computed/derived properties for UI
  description: string;
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
}

// Apps slice state
export interface AppsState {
  apps: App[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: "all" | "active" | "stopped";
  sortBy: "recent" | "name";
}

// App Agent Sessions slice state
export interface AppAgentSessionsState {
  sessions: Record<string, AppAgentSessionFromAPI[]>; // Keyed by app_id
  loading: boolean;
  error: string | null;
}

// Root state type
export type RootState = {
  apps: AppsState;
  appAgentSessions: AppAgentSessionsState;
  appChat: import("./slices/appChatSlice").AppChatState;
};

// API request types
export interface CreateAppRequest {
  name: string;
}
