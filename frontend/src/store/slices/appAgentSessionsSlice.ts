import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AppAgentSessionFromAPI, AppAgentSessionsState } from "@/store/types";

// Async thunk for fetching app agent sessions for a specific app
export const fetchAppAgentSessions = createAsyncThunk(
  "appAgentSessions/fetchAppAgentSessions",
  async (appId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/apps/${appId}/sessions`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sessions: AppAgentSessionFromAPI[] = await response.json();
      return { appId, sessions };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch app agent sessions",
      );
    }
  },
);

// Async thunk for creating a new app agent session
export const createAppAgentSession = createAsyncThunk(
  "appAgentSessions/createAppAgentSession",
  async (appId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/apps/${appId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const session: AppAgentSessionFromAPI = await response.json();
      return { appId, session };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create app agent session",
      );
    }
  },
);

// Async thunk for stopping an app agent session
export const stopAppAgentSession = createAsyncThunk(
  "appAgentSessions/stopAppAgentSession",
  async (
    { appId, sessionId }: { appId: string; sessionId: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(`/api/apps/${appId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const session: AppAgentSessionFromAPI = await response.json();
      return { appId, session };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to stop app agent session",
      );
    }
  },
);

const initialState: AppAgentSessionsState = {
  sessions: {},
  loading: false,
  error: null,
};

const appAgentSessionsSlice = createSlice({
  name: "appAgentSessions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSessionsForApp: (state, action: PayloadAction<string>) => {
      const appId = action.payload;
      delete state.sessions[appId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch app agent sessions
      .addCase(fetchAppAgentSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppAgentSessions.fulfilled, (state, action) => {
        state.loading = false;
        const { appId, sessions } = action.payload;
        state.sessions[appId] = sessions;
      })
      .addCase(fetchAppAgentSessions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to fetch app agent sessions";
      })
      // Create app agent session
      .addCase(createAppAgentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAppAgentSession.fulfilled, (state, action) => {
        state.loading = false;
        const { appId, session } = action.payload;
        if (!state.sessions[appId]) {
          state.sessions[appId] = [];
        }
        state.sessions[appId].unshift(session); // Add to beginning (newest first)
      })
      .addCase(createAppAgentSession.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to create app agent session";
      })
      // Stop app agent session
      .addCase(stopAppAgentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(stopAppAgentSession.fulfilled, (state, action) => {
        state.loading = false;
        const { appId, session } = action.payload;
        if (state.sessions[appId]) {
          const sessionIndex = state.sessions[appId].findIndex(
            (s) => s.id === session.id,
          );
          if (sessionIndex !== -1) {
            state.sessions[appId][sessionIndex] = session;
          }
        }
      })
      .addCase(stopAppAgentSession.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to stop app agent session";
      });
  },
});

export const { clearError, clearSessionsForApp } =
  appAgentSessionsSlice.actions;

// Selectors
export const selectAppAgentSessions = (state: {
  appAgentSessions: AppAgentSessionsState;
}) => state.appAgentSessions.sessions;

export const selectAppAgentSessionsForApp =
  (appId: string) => (state: { appAgentSessions: AppAgentSessionsState }) =>
    state.appAgentSessions.sessions[appId] || [];

export const selectAppAgentSessionsLoading = (state: {
  appAgentSessions: AppAgentSessionsState;
}) => state.appAgentSessions.loading;

export const selectAppAgentSessionsError = (state: {
  appAgentSessions: AppAgentSessionsState;
}) => state.appAgentSessions.error;

export default appAgentSessionsSlice.reducer;
