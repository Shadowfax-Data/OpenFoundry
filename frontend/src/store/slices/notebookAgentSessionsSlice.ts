import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { NotebookAgentSessionsState } from "@/store/types";
import { createAgentSessionThunks } from "@/store/utils/agentSessionThunks";

// Create all the async thunks using the generic factory
const thunks = createAgentSessionThunks("notebooks", "notebookAgentSessions");

// Export the thunks with their original names for backward compatibility
export const fetchNotebookAgentSessions = thunks.fetchSessions;
export const createNotebookAgentSession = thunks.createSession;
export const stopNotebookAgentSession = thunks.stopSession;
export const resumeNotebookAgentSession = thunks.resumeSession;
export const saveNotebookWorkspace = thunks.saveWorkspace!; // Non-null assertion since this is notebooks

const initialState: NotebookAgentSessionsState = {
  sessions: {},
  loading: false,
  error: null,
};

const notebookAgentSessionsSlice = createSlice({
  name: "notebookAgentSessions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSessionsForNotebook: (state, action: PayloadAction<string>) => {
      const notebookId = action.payload;
      delete state.sessions[notebookId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notebook agent sessions
      .addCase(fetchNotebookAgentSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotebookAgentSessions.fulfilled, (state, action) => {
        state.loading = false;
        const { notebookId, sessions } = action.payload;
        state.sessions[notebookId] = sessions;
      })
      .addCase(fetchNotebookAgentSessions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          "Failed to fetch notebook agent sessions";
      })
      // Create notebook agent session
      .addCase(createNotebookAgentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNotebookAgentSession.fulfilled, (state, action) => {
        state.loading = false;
        const { notebookId, session } = action.payload;
        if (!state.sessions[notebookId]) {
          state.sessions[notebookId] = [];
        }
        state.sessions[notebookId].unshift(session); // Add to beginning (newest first)
      })
      .addCase(createNotebookAgentSession.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          "Failed to create notebook agent session";
      })
      // Stop notebook agent session
      .addCase(stopNotebookAgentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(stopNotebookAgentSession.fulfilled, (state, action) => {
        state.loading = false;
        const { notebookId, session } = action.payload;
        if (state.sessions[notebookId]) {
          const sessionIndex = state.sessions[notebookId].findIndex(
            (s) => s.id === session.id,
          );
          if (sessionIndex !== -1) {
            state.sessions[notebookId][sessionIndex] = session;
          }
        }
      })
      .addCase(stopNotebookAgentSession.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to stop notebook agent session";
      })
      // Resume notebook agent session
      .addCase(resumeNotebookAgentSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resumeNotebookAgentSession.fulfilled, (state, action) => {
        state.loading = false;
        const { notebookId, session } = action.payload;
        if (state.sessions[notebookId]) {
          const sessionIndex = state.sessions[notebookId].findIndex(
            (s) => s.id === session.id,
          );
          if (sessionIndex !== -1) {
            state.sessions[notebookId][sessionIndex] = session;
          }
        }
      })
      .addCase(resumeNotebookAgentSession.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          "Failed to resume notebook agent session";
      })
      // Save notebook workspace
      .addCase(saveNotebookWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveNotebookWorkspace.fulfilled, (state) => {
        state.loading = false;
        // Could add success message to state if needed
      })
      .addCase(saveNotebookWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to save notebook workspace";
      });
  },
});

export const { clearError, clearSessionsForNotebook } =
  notebookAgentSessionsSlice.actions;

// Selectors
export const selectNotebookAgentSessions = (state: {
  notebookAgentSessions: NotebookAgentSessionsState;
}) => state.notebookAgentSessions.sessions;

export const selectNotebookAgentSessionsForNotebook =
  (notebookId: string) =>
  (state: { notebookAgentSessions: NotebookAgentSessionsState }) =>
    state.notebookAgentSessions.sessions[notebookId] || [];

export const selectNotebookAgentSessionsLoading = (state: {
  notebookAgentSessions: NotebookAgentSessionsState;
}) => state.notebookAgentSessions.loading;

export const selectNotebookAgentSessionsError = (state: {
  notebookAgentSessions: NotebookAgentSessionsState;
}) => state.notebookAgentSessions.error;

// Selector to get a specific session by notebookId and sessionId
export const selectNotebookAgentSessionById =
  (notebookId: string, sessionId: string) =>
  (state: { notebookAgentSessions: NotebookAgentSessionsState }) => {
    const sessions = state.notebookAgentSessions.sessions[notebookId] || [];
    return sessions.find((s) => s.id === sessionId);
  };

export default notebookAgentSessionsSlice.reducer;
