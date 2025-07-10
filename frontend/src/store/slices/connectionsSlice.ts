import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Connection,
  SnowflakeConnectionCreate,
  SnowflakeConnectionUpdate,
  SnowflakeConnectionModel,
} from "@/types/api";
import { ConnectionsState } from "@/store/types";

// Async thunk for fetching connections
export const fetchConnections = createAsyncThunk(
  "connections/fetchConnections",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/connections");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const connections: Connection[] = await response.json();
      return connections;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch connections",
      );
    }
  },
);

// Async thunk for fetching a single snowflake connection
export const fetchSnowflakeConnection = createAsyncThunk(
  "connections/fetchSnowflakeConnection",
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/connections/snowflake/${connectionId}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const connection: SnowflakeConnectionModel = await response.json();
      return connection;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch connection details",
      );
    }
  },
);

// Async thunk for creating a new snowflake connection
export const createSnowflakeConnection = createAsyncThunk(
  "connections/createSnowflakeConnection",
  async (connectionData: SnowflakeConnectionCreate, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/connections/snowflake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(connectionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create connection");
      }

      const newConnection: Connection = await response.json();
      return newConnection;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create connection",
      );
    }
  },
);

// Async thunk for updating a snowflake connection
export const updateSnowflakeConnection = createAsyncThunk(
  "connections/updateSnowflakeConnection",
  async (
    {
      connectionId,
      connectionData,
    }: { connectionId: string; connectionData: SnowflakeConnectionUpdate },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `/api/connections/snowflake/${connectionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(connectionData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update connection");
      }

      const updatedConnection: Connection = await response.json();
      return updatedConnection;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update connection",
      );
    }
  },
);

// Async thunk for deleting a connection
export const deleteConnection = createAsyncThunk(
  "connections/deleteConnection",
  async (connectionId: string, { rejectWithValue, getState }) => {
    try {
      // We need to know the type to hit the correct endpoint.
      const state = getState() as { connections: ConnectionsState };
      const connection = state.connections.connections.find(
        (c) => c.id === connectionId,
      );

      if (!connection) {
        throw new Error("Connection not found in state");
      }

      const response = await fetch(
        `/api/connections/${connection.connection_type.toLowerCase()}/${connectionId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to delete connection`);
      }

      return connectionId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete connection",
      );
    }
  },
);

const initialState: ConnectionsState = {
  connections: [],
  loading: false,
  error: null,
  searchQuery: "",
  sortBy: "recent",
  currentConnection: null,
};

const connectionsSlice = createSlice({
  name: "connections",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSortBy: (state, action: PayloadAction<"recent" | "name">) => {
      state.sortBy = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch connections
      .addCase(fetchConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = action.payload;
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to fetch connections";
      })
      // Fetch single snowflake connection
      .addCase(fetchSnowflakeConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentConnection = null;
      })
      .addCase(fetchSnowflakeConnection.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConnection = action.payload;
      })
      .addCase(fetchSnowflakeConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to fetch connection details";
      })
      // Create connection
      .addCase(createSnowflakeConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSnowflakeConnection.fulfilled, (state, action) => {
        state.loading = false;
        state.connections.unshift(action.payload);
      })
      .addCase(createSnowflakeConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to create connection";
      })
      // Update connection
      .addCase(updateSnowflakeConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSnowflakeConnection.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.connections.findIndex(
          (c) => c.id === action.payload.id,
        );
        if (index !== -1) {
          state.connections[index] = action.payload;
        }
      })
      .addCase(updateSnowflakeConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to update connection";
      })
      // Delete connection
      .addCase(deleteConnection.pending, (state) => {
        // We could set a specific loading state for the card, but for now global is fine
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteConnection.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = state.connections.filter(
          (c) => c.id !== action.payload,
        );
      })
      .addCase(deleteConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to delete connection";
      });
  },
});

export const {
  setSearchQuery: setConnectionsSearchQuery,
  setSortBy: setConnectionsSortBy,
  clearError: clearConnectionsError,
} = connectionsSlice.actions;

export default connectionsSlice.reducer;
