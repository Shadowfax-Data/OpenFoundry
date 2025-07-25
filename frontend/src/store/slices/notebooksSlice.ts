import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { formatTimeAgo, generateColorFromText } from "@/lib/utils";
import { NotebooksState } from "@/store/types";
import { CreateNotebookRequest, Notebook, NotebookFromAPI } from "@/types/api";

// Helper function to transform backend notebook to frontend notebook
const transformNotebookFromAPI = (apiNotebook: NotebookFromAPI): Notebook => {
  return {
    ...apiNotebook,
    color: generateColorFromText(apiNotebook.name),
    lastModified: formatTimeAgo(apiNotebook.updated_on),
  };
};

// Async thunk for fetching notebooks from real API
export const fetchNotebooks = createAsyncThunk(
  "notebooks/fetchNotebooks",
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/notebooks");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiNotebooks: NotebookFromAPI[] = await response.json();
      return apiNotebooks.map(transformNotebookFromAPI);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch notebooks",
      );
    }
  },
);

// Async thunk for creating new notebook
export const createNotebook = createAsyncThunk(
  "notebooks/createNotebook",
  async (notebookData: CreateNotebookRequest, { rejectWithValue }) => {
    try {
      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notebookData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiNotebook: NotebookFromAPI = await response.json();
      return transformNotebookFromAPI(apiNotebook);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create notebook",
      );
    }
  },
);

// Async thunk for getting single notebook
export const fetchNotebook = createAsyncThunk(
  "notebooks/fetchNotebook",
  async (notebookId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notebooks/${notebookId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiNotebook: NotebookFromAPI = await response.json();
      return transformNotebookFromAPI(apiNotebook);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch notebook",
      );
    }
  },
);

// Async thunk for deleting a notebook
export const deleteNotebook = createAsyncThunk(
  "notebooks/deleteNotebook",
  async (notebookId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/notebooks/${notebookId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return notebookId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete notebook",
      );
    }
  },
);

const initialState: NotebooksState = {
  notebooks: [],
  loading: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",
  sortBy: "recent",
};

const notebooksSlice = createSlice({
  name: "notebooks",
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
      // Fetch notebooks
      .addCase(fetchNotebooks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotebooks.fulfilled, (state, action) => {
        state.loading = false;
        state.notebooks = action.payload;
      })
      .addCase(fetchNotebooks.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch notebooks";
      })
      // Create notebook
      .addCase(createNotebook.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNotebook.fulfilled, (state, action) => {
        state.loading = false;
        state.notebooks.unshift(action.payload); // Add to beginning (newest first)
      })
      .addCase(createNotebook.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to create notebook";
      })
      // Fetch single notebook
      .addCase(fetchNotebook.fulfilled, (state, action) => {
        const index = state.notebooks.findIndex(
          (notebook) => notebook.id === action.payload.id,
        );
        if (index !== -1) {
          state.notebooks[index] = action.payload;
        } else {
          state.notebooks.push(action.payload);
        }
      })
      // Delete notebook
      .addCase(deleteNotebook.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteNotebook.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the deleted notebook from the state
        state.notebooks = state.notebooks.filter(
          (notebook) => notebook.id !== action.payload,
        );
      })
      .addCase(deleteNotebook.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to delete notebook";
      });
  },
});

export const { setSearchQuery, setStatusFilter, setSortBy, clearError } =
  notebooksSlice.actions;

export default notebooksSlice.reducer;
