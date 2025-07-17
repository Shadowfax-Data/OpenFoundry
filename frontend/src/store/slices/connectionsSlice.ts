import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { generateColorFromText } from "@/lib/utils";
import { ConnectionsState } from "@/store/types";
import {
  ClickhouseConnectionCreate,
  ClickhouseConnectionUpdate,
  Connection,
  ConnectionFromAPI,
  DatabricksConnectionCreate,
  DatabricksConnectionUpdate,
  PostgresConnectionCreate,
  PostgresConnectionUpdate,
  SnowflakeConnectionCreate,
  SnowflakeConnectionUpdate,
} from "@/types/api";

// Helper function to transform backend connection to frontend connection
const transformConnectionFromAPI = (
  apiConnection: ConnectionFromAPI,
): Connection => {
  return {
    ...apiConnection,
    color: generateColorFromText(apiConnection.name),
  };
};

// Async thunk for fetching connections
export const fetchConnections = createAsyncThunk(
  "connections/fetchConnections",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/connections");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiConnections: ConnectionFromAPI[] = await response.json();
      return apiConnections.map(transformConnectionFromAPI);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch connections",
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update connection",
      );
    }
  },
);

// Async thunk for creating a new databricks connection
export const createDatabricksConnection = createAsyncThunk(
  "connections/createDatabricksConnection",
  async (connectionData: DatabricksConnectionCreate, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/connections/databricks", {
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create connection",
      );
    }
  },
);

// Async thunk for updating a databricks connection
export const updateDatabricksConnection = createAsyncThunk(
  "connections/updateDatabricksConnection",
  async (
    {
      connectionId,
      connectionData,
    }: { connectionId: string; connectionData: DatabricksConnectionUpdate },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `/api/connections/databricks/${connectionId}`,
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update connection",
      );
    }
  },
);

// Async thunk for creating a new clickhouse connection
export const createClickhouseConnection = createAsyncThunk(
  "connections/createClickhouseConnection",
  async (connectionData: ClickhouseConnectionCreate, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/connections/clickhouse", {
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create connection",
      );
    }
  },
);

// Async thunk for updating a clickhouse connection
export const updateClickhouseConnection = createAsyncThunk(
  "connections/updateClickhouseConnection",
  async (
    {
      connectionId,
      connectionData,
    }: { connectionId: string; connectionData: ClickhouseConnectionUpdate },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `/api/connections/clickhouse/${connectionId}`,
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update connection",
      );
    }
  },
);

// Async thunk for creating a new postgres connection
export const createPostgresConnection = createAsyncThunk(
  "connections/createPostgresConnection",
  async (connectionData: PostgresConnectionCreate, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/connections/postgres", {
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create connection",
      );
    }
  },
);

// Async thunk for updating a postgres connection
export const updatePostgresConnection = createAsyncThunk(
  "connections/updatePostgresConnection",
  async (
    {
      connectionId,
      connectionData,
    }: { connectionId: string; connectionData: PostgresConnectionUpdate },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch(
        `/api/connections/postgres/${connectionId}`,
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

      const apiConnection: ConnectionFromAPI = await response.json();
      return transformConnectionFromAPI(apiConnection);
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
        `/api/connections/${connection.type.toLowerCase()}/${connectionId}`,
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
      // Create snowflake connection
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
      // Create databricks connection
      .addCase(createDatabricksConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDatabricksConnection.fulfilled, (state, action) => {
        state.loading = false;
        state.connections.unshift(action.payload);
      })
      .addCase(createDatabricksConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to create connection";
      })
      // Update snowflake connection
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
      // Update databricks connection
      .addCase(updateDatabricksConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateDatabricksConnection.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.connections.findIndex(
          (c) => c.id === action.payload.id,
        );
        if (index !== -1) {
          state.connections[index] = action.payload;
        }
      })
      .addCase(updateDatabricksConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to update connection";
      })
      // Create clickhouse connection
      .addCase(createClickhouseConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createClickhouseConnection.fulfilled, (state, action) => {
        state.loading = false;
        state.connections.unshift(action.payload);
      })
      .addCase(createClickhouseConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to create connection";
      })
      // Update clickhouse connection
      .addCase(updateClickhouseConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClickhouseConnection.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.connections.findIndex(
          (c) => c.id === action.payload.id,
        );
        if (index !== -1) {
          state.connections[index] = action.payload;
        }
      })
      .addCase(updateClickhouseConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to update connection";
      })
      // Create postgres connection
      .addCase(createPostgresConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPostgresConnection.fulfilled, (state, action) => {
        state.loading = false;
        state.connections.unshift(action.payload);
      })
      .addCase(createPostgresConnection.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || "Failed to create connection";
      })
      // Update postgres connection
      .addCase(updatePostgresConnection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePostgresConnection.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.connections.findIndex(
          (c) => c.id === action.payload.id,
        );
        if (index !== -1) {
          state.connections[index] = action.payload;
        }
      })
      .addCase(updatePostgresConnection.rejected, (state, action) => {
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
