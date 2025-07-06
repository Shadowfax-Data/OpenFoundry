import { App, AppAgentSessionFromAPI } from "@/types/api";
import { AppChatState } from "./slices/appChatSlice";

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
  appChat: AppChatState;
};
