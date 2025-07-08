import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { App, AppFromAPI, CreateAppRequest } from "@/types/api";
import { AppsState } from "@/store/types";

// Helper function to transform backend app to frontend app
const transformAppFromAPI = (apiApp: AppFromAPI): App => {
  // Generate UI-specific properties based on app data
  const colors = [
    "bg-blue-600",
    "bg-green-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-red-600",
    "bg-indigo-600",
    "bg-pink-600",
    "bg-cyan-600",
  ];

  // Use app name hash to consistently assign color
  const colorIndex =
    apiApp.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;

  // Calculate time ago from updated_on
  const updatedDate = new Date(apiApp.updated_on);
  const now = new Date();
  const diffInMs = now.getTime() - updatedDate.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  let lastModified: string;
  if (diffInHours < 1) {
    lastModified = "Just now";
  } else if (diffInHours < 24) {
    lastModified = `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInDays < 7) {
    lastModified = `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else {
    lastModified = updatedDate.toLocaleDateString();
  }

  return {
    ...apiApp,
    color: colors[colorIndex],
    lastModified,
  };
};

// Async thunk for fetching apps from real API
export const fetchApps = createAsyncThunk(
  "apps/fetchApps",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/apps");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiApps: AppFromAPI[] = await response.json();
      return apiApps.map(transformAppFromAPI);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch apps",
      );
    }
  },
);

// Async thunk for creating new app
export const createApp = createAsyncThunk(
  "apps/createApp",
  async (appData: CreateAppRequest, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/apps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiApp: AppFromAPI = await response.json();
      return transformAppFromAPI(apiApp);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create app",
      );
    }
  },
);

// Async thunk for getting single app
export const fetchApp = createAsyncThunk(
  "apps/fetchApp",
  async (appId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/apps/${appId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiApp: AppFromAPI = await response.json();
      return transformAppFromAPI(apiApp);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch app",
      );
    }
  },
);

// Async thunk for deleting an app
export const deleteApp = createAsyncThunk(
  "apps/deleteApp",
  async (appId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/apps/${appId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return appId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete app",
      );
    }
  },
);

// Async thunk for deploying an app
export const deployApp = createAsyncThunk(
  "apps/deployApp",
  async (appId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/apps/${appId}/deploy`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiApp: AppFromAPI = await response.json();
      return transformAppFromAPI(apiApp);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to deploy app",
      );
    }
  },
);

const initialState: AppsState = {
  apps: [],
  loading: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",
  sortBy: "recent",
};

const appsSlice = createSlice({
  name: "apps",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (
      state,
      action: PayloadAction<"all" | "active" | "stopped">,
    ) => {
      state.statusFilter = action.payload;
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
      // Fetch apps
      .addCase(fetchApps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApps.fulfilled, (state, action) => {
        state.loading = false;
        state.apps = action.payload;
      })
      .addCase(fetchApps.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch apps";
      })
      // Create app
      .addCase(createApp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createApp.fulfilled, (state, action) => {
        state.loading = false;
        state.apps.unshift(action.payload); // Add to beginning (newest first)
      })
      .addCase(createApp.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to create app";
      })
      // Fetch single app
      .addCase(fetchApp.fulfilled, (state, action) => {
        const index = state.apps.findIndex(
          (app) => app.id === action.payload.id,
        );
        if (index !== -1) {
          state.apps[index] = action.payload;
        } else {
          state.apps.push(action.payload);
        }
      })
      // Delete app
      .addCase(deleteApp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteApp.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the deleted app from the state
        state.apps = state.apps.filter((app) => app.id !== action.payload);
      })
      .addCase(deleteApp.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to delete app";
      })
      // Deploy app
      .addCase(deployApp.fulfilled, (state, action) => {
        // Update the app in the state with the new deployment info
        const index = state.apps.findIndex(
          (app) => app.id === action.payload.id,
        );
        if (index !== -1) {
          state.apps[index] = action.payload;
        }
      })
      .addCase(deployApp.rejected, (state, action) => {
        state.error = (action.payload as string) || "Failed to deploy app";
      });
  },
});

export const { setSearchQuery, setStatusFilter, setSortBy, clearError } =
  appsSlice.actions;

export default appsSlice.reducer;
