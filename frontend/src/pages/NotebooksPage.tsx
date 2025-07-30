import { BookOpen, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { CreateNotebookDialog } from "@/components/notebooks/CreateNotebookDialog";
import NotebookCard from "@/components/notebooks/NotebookCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchConnections } from "@/store/slices/connectionsSlice";
import {
  clearError as clearSessionsError,
  createNotebookAgentSession,
  deleteNotebookAgentSession,
  fetchNotebookAgentSessions,
  resumeNotebookAgentSession,
  saveNotebookWorkspace,
  stopNotebookAgentSession,
} from "@/store/slices/notebookAgentSessionsSlice";
import {
  clearError,
  deleteNotebook,
  fetchNotebooks,
  setSearchQuery,
  setSortBy,
  setStatusFilter,
} from "@/store/slices/notebooksSlice";

interface NotebooksPageProps {
  autoOpenCreateDialog?: boolean;
}

export function NotebooksPage({
  autoOpenCreateDialog = false,
}: NotebooksPageProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notebooks, loading, error, searchQuery, statusFilter, sortBy } =
    useAppSelector((state) => state.notebooks);
  const { sessions } = useAppSelector((state) => state.notebookAgentSessions);

  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Track loading state for Edit button per notebook
  const [editLoadingNotebookId, setEditLoadingNotebookId] = useState<
    string | null
  >(null);

  // Track loading state for Save button per notebook
  const [saveLoadingNotebookId, setSaveLoadingNotebookId] = useState<
    string | null
  >(null);

  // Auto-open create dialog if prop is true
  useEffect(() => {
    if (autoOpenCreateDialog) {
      setIsCreateDialogOpen(true);
    }
  }, [autoOpenCreateDialog]);

  // Fetch notebooks on component mount
  useEffect(() => {
    dispatch(fetchNotebooks());
    dispatch(fetchConnections());
  }, [dispatch]);

  // Fetch notebook agent sessions for each notebook when notebooks are loaded
  useEffect(() => {
    if (notebooks.length > 0) {
      notebooks.forEach((notebook) => {
        // Only fetch if we don't already have sessions for this notebook
        if (!sessions[notebook.id]) {
          dispatch(fetchNotebookAgentSessions(notebook.id));
        }
      });
    }
  }, [notebooks, sessions, dispatch]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSessionsError());
    };
  }, [dispatch]);

  // Helper function to get session count for a notebook
  const getNotebookSessionCount = (notebookId: string) => {
    return sessions[notebookId]?.length || 0;
  };

  // Helper function to get the most recent active session for a notebook
  const getNotebookSessionStatus = useCallback(
    (notebookId: string) => {
      const notebookSessions = sessions[notebookId] || [];
      const activeSession = notebookSessions.find(
        (session) => session.status === "active",
      );
      return activeSession ? "active" : "stopped";
    },
    [sessions],
  );

  // Filter and sort notebooks based on current state
  const filteredAndSortedNotebooks = useMemo(() => {
    let filteredNotebooks = notebooks;

    // Apply search filter
    if (searchQuery) {
      filteredNotebooks = filteredNotebooks.filter((notebook) =>
        notebook.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply status filter based on agent session status
    if (statusFilter !== "all") {
      filteredNotebooks = filteredNotebooks.filter((notebook) => {
        const sessionStatus = getNotebookSessionStatus(notebook.id);
        return sessionStatus === statusFilter;
      });
    }

    // Apply sorting
    const sortedNotebooks = [...filteredNotebooks].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
        default:
          // Sort by created_on date (newest first)
          return (
            new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
          );
      }
    });

    return sortedNotebooks;
  }, [notebooks, searchQuery, statusFilter, sortBy, getNotebookSessionStatus]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(e.target.value));
  };

  const handleStatusChange = (value: string) => {
    dispatch(setStatusFilter(value as "all" | "active" | "stopped"));
  };

  const handleSortChange = (value: string) => {
    dispatch(setSortBy(value as "recent" | "name"));
  };

  // Helper to handle Edit button click
  const handleEditClick = async (notebookId: string) => {
    setEditLoadingNotebookId(notebookId);
    const notebookSessions = sessions[notebookId] || [];
    // Find active session
    const activeSession = notebookSessions.find((s) => s.status === "active");
    let sessionToGo: (typeof notebookSessions)[number] | null = null;

    try {
      if (activeSession) {
        // Active session exists, resume it to ensure it's properly started
        const result = await dispatch(
          resumeNotebookAgentSession({
            notebookId,
            sessionId: activeSession.id,
          }),
        ).unwrap();
        sessionToGo = result.session;
      } else if (notebookSessions.length > 0) {
        // Find latest session by created_on and resume it
        sessionToGo = [...notebookSessions].sort(
          (a, b) =>
            new Date(b.created_on).getTime() - new Date(a.created_on).getTime(),
        )[0];

        // Resume the existing session
        const result = await dispatch(
          resumeNotebookAgentSession({ notebookId, sessionId: sessionToGo.id }),
        ).unwrap();
        sessionToGo = result.session;
      } else {
        // No sessions exist, create a new one
        const result = await dispatch(
          createNotebookAgentSession(notebookId),
        ).unwrap();
        sessionToGo = result.session;
      }

      if (sessionToGo) {
        navigate(`/notebooks/${notebookId}/sessions/${sessionToGo.id}/chat`);
      } else {
        // Fallback: create a new session
        const result = await dispatch(
          createNotebookAgentSession(notebookId),
        ).unwrap();
        navigate(`/notebooks/${notebookId}/sessions/${result.session.id}/chat`);
      }
    } catch (e) {
      // Optionally show error
      console.error("Failed to start or find session", e);
    } finally {
      setEditLoadingNotebookId(null);
    }
  };

  // Helper to handle Stop Session action
  const handleStopSession = async (notebookId: string) => {
    const notebookSessions = sessions[notebookId] || [];
    const activeSession = notebookSessions.find((s) => s.status === "active");

    if (activeSession) {
      try {
        await dispatch(
          stopNotebookAgentSession({ notebookId, sessionId: activeSession.id }),
        ).unwrap();
      } catch (error) {
        console.error("Failed to stop session:", error);
      }
    }
  };

  // Helper to handle Delete Session action
  const handleDeleteSession = async (notebookId: string) => {
    const notebookSessions = sessions[notebookId] || [];
    // Find the most recent session to delete
    const sessionToDelete = [...notebookSessions].sort(
      (a, b) =>
        new Date(b.created_on).getTime() - new Date(a.created_on).getTime(),
    )[0];

    if (sessionToDelete) {
      try {
        await dispatch(
          deleteNotebookAgentSession({
            notebookId,
            sessionId: sessionToDelete.id,
          }),
        ).unwrap();
      } catch (error) {
        console.error("Failed to delete session:", error);
      }
    }
  };

  // Helper to handle Save Notebook action
  const handleSaveNotebook = async (notebookId: string) => {
    const notebookSessions = sessions[notebookId] || [];
    const activeSession = notebookSessions.find((s) => s.status === "active");

    if (activeSession) {
      setSaveLoadingNotebookId(notebookId);
      try {
        await dispatch(
          saveNotebookWorkspace({ notebookId, sessionId: activeSession.id }),
        ).unwrap();
      } catch (error) {
        console.error("Failed to save notebook:", error);
      } finally {
        setSaveLoadingNotebookId(null);
      }
    }
  };

  // Helper to handle Delete Notebook action
  const handleDeleteNotebook = async (notebookId: string) => {
    try {
      await dispatch(deleteNotebook(notebookId)).unwrap();
      // Notebook will be automatically removed from the state by the Redux reducer
    } catch (error) {
      console.error("Failed to delete notebook:", error);
      // Error is handled by Redux state
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto">
        <div className="p-8 mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Notebooks</h1>
                <p className="text-muted-foreground">
                  Create and manage your interactive notebooks
                </p>
              </div>
              <Button
                className="flex items-center gap-2"
                disabled={loading}
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                New Notebook
              </Button>
            </div>

            {/* Search and filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notebooks..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="stopped">Stopped Only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[140px]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Session Creation Loading Overlay */}
          {isCreatingSession && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span>Creating notebook session...</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedNotebooks.map((notebook) => {
                const sessionStatus = getNotebookSessionStatus(notebook.id);
                const sessionCount = getNotebookSessionCount(notebook.id);

                return (
                  <NotebookCard
                    key={notebook.id}
                    notebook={notebook}
                    sessionStatus={sessionStatus}
                    sessionCount={sessionCount}
                    isEditLoading={editLoadingNotebookId === notebook.id}
                    isSaveLoading={saveLoadingNotebookId === notebook.id}
                    onEditClick={handleEditClick}
                    onStopSession={handleStopSession}
                    onDeleteSession={handleDeleteSession}
                    onSaveNotebook={handleSaveNotebook}
                    onDeleteNotebook={handleDeleteNotebook}
                  />
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredAndSortedNotebooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-lg bg-muted p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {notebooks.length === 0
                    ? "No notebooks yet"
                    : "No notebooks match your filters"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {notebooks.length === 0
                    ? "Get started by creating your first notebook"
                    : "Try adjusting your search or filter criteria"}
                </p>
                <div className="flex justify-center">
                  <Button
                    className="flex items-center gap-2"
                    disabled={loading}
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    New Notebook
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Notebook Dialog - rendered conditionally */}
      {isCreateDialogOpen && (
        <CreateNotebookDialog
          onCreatingSession={setIsCreatingSession}
          onClose={() => setIsCreateDialogOpen(false)}
          disabled={loading}
        />
      )}
    </div>
  );
}

export default NotebooksPage;
