import { App, AppAgentSessionFromAPI, Connection, Notebook, NotebookAgentSessionFromAPI } from "@/types/api";

import { AppChatState } from "./slices/appChatSlice";
import { NotebookChatState } from "./slices/notebookChatSlice";

// Apps slice state
export interface AppsState {
  apps: App[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: "all" | "active" | "stopped";
  sortBy: "recent" | "name";
}

// Connections slice state
export interface ConnectionsState {
  connections: Connection[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  // Add any other filters like type, etc. if needed
  // statusFilter: "all" | "active" | "failed";
  sortBy: "recent" | "name";
}

// Notebooks slice state
export interface NotebooksState {
  notebooks: Notebook[];
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

// Notebook Agent Sessions slice state
export interface NotebookAgentSessionsState {
  sessions: Record<string, NotebookAgentSessionFromAPI[]>; // Keyed by notebook_id
  loading: boolean;
  error: string | null;
}

// Root state type
export type RootState = {
  apps: AppsState;
  appAgentSessions: AppAgentSessionsState;
  appChat: AppChatState;
  connections: ConnectionsState;
  notebooks: NotebooksState;
  notebookAgentSessions: NotebookAgentSessionsState;
  notebookChat: NotebookChatState;
};
