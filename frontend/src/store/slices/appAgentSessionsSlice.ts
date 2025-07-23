import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { AppAgentSessionsState } from "@/store/types";
import { createAgentSessionThunks } from "@/store/utils/agentSessionThunks";

// Create all the async thunks using the generic factory
const thunks = createAgentSessionThunks("apps", "appAgentSessions");

// Export the thunks with their original names for backward compatibility
export const fetchAppAgentSessions = thunks.fetchSessions;
export const createAppAgentSession = thunks.createSession;
export const stopAppAgentSession = thunks.stopSession;
export const resumeAppAgentSession = thunks.resumeSession;
export const deleteAppAgentSession = thunks.deleteSession!; // Non-null assertion since this is apps

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
      })
      // Resume app agent session
      .addCase(resumeAppAgentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resumeAppAgentSession.fulfilled, (state, action) => {
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
      .addCase(resumeAppAgentSession.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to resume app agent session";
      })
      // Delete app agent session
      .addCase(deleteAppAgentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAppAgentSession.fulfilled, (state, action) => {
        state.loading = false;
        const { appId, sessionId } = action.payload;
        if (state.sessions[appId]) {
          state.sessions[appId] = state.sessions[appId].filter(
            (s) => s.id !== sessionId,
          );
        }
      })
      .addCase(deleteAppAgentSession.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to delete app agent session";
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

// Selector to get a specific session by appId and sessionId
export const selectAppAgentSessionById =
  (appId: string, sessionId: string) =>
  (state: { appAgentSessions: AppAgentSessionsState }) => {
    const sessions = state.appAgentSessions.sessions[appId] || [];
    return sessions.find((s) => s.id === sessionId);
  };

export default appAgentSessionsSlice.reducer;
