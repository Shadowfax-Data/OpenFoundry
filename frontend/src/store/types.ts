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
  status: "active" | "draft";
  lastModified: string; // Human-readable format
}

// Apps slice state
export interface AppsState {
  apps: App[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: "all" | "active" | "draft";
  sortBy: "recent" | "name";
}

// Root state type
export type RootState = {
  apps: AppsState;
};

// API request types
export interface CreateAppRequest {
  name: string;
}
