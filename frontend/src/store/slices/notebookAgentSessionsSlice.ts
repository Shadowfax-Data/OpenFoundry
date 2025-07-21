import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { NotebookAgentSessionsState } from "@/store/types";
import { NotebookAgentSessionFromAPI } from "@/types/api";

// Async thunk for fetching notebook agent sessions for a specific notebook
export const fetchNotebookAgentSessions = createAsyncThunk(
  "notebookAgentSessions/fetchNotebookAgentSessions",
  async (notebookId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notebooks/${notebookId}/sessions`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const sessions: NotebookAgentSessionFromAPI[] = await response.json();
      return { notebookId, sessions };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch notebook agent sessions",
      );
    }
  },
);

// Async thunk for creating a new notebook agent session
export const createNotebookAgentSession = createAsyncThunk(
  "notebookAgentSessions/createNotebookAgentSession",
  async (notebookId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notebooks/${notebookId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const session: NotebookAgentSessionFromAPI = await response.json();
      return { notebookId, session };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create notebook agent session",
      );
    }
  },
);

// Async thunk for stopping a notebook agent session
export const stopNotebookAgentSession = createAsyncThunk(
  "notebookAgentSessions/stopNotebookAgentSession",
  async (
    { notebookId, sessionId }: { notebookId: string; sessionId: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `/api/notebooks/${notebookId}/sessions/${sessionId}/stop`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const session: NotebookAgentSessionFromAPI = await response.json();
      return { notebookId, session };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to stop notebook agent session",
      );
    }
  },
);

// Async thunk for resuming a notebook agent session
export const resumeNotebookAgentSession = createAsyncThunk(
  "notebookAgentSessions/resumeNotebookAgentSession",
  async (
    { notebookId, sessionId }: { notebookId: string; sessionId: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `/api/notebooks/${notebookId}/sessions/${sessionId}/resume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const session: NotebookAgentSessionFromAPI = await response.json();
      return { notebookId, session };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to resume notebook agent session",
      );
    }
  },
);

// Async thunk for saving notebook workspace
export const saveNotebookWorkspace = createAsyncThunk(
  "notebookAgentSessions/saveNotebookWorkspace",
  async (
    { notebookId, sessionId }: { notebookId: string; sessionId: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `/api/notebooks/${notebookId}/sessions/${sessionId}/save`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { notebookId, sessionId, message: result.message };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to save notebook workspace",
      );
    }
  },
);

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
