import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  AppWindowMac,
  X,
  Play,
  Square,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchApps,
  createApp,
  setSearchQuery,
  setStatusFilter,
  setSortBy,
  clearError,
} from "@/store/slices/appsSlice";
import {
  fetchAppAgentSessions,
  clearError as clearSessionsError,
  createAppAgentSession,
} from "@/store/slices/appAgentSessionsSlice";

export function Apps() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { apps, loading, error, searchQuery, statusFilter, sortBy } =
    useAppSelector((state) => state.apps);
  const { sessions, error: sessionsError } = useAppSelector(
    (state) => state.appAgentSessions,
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAppName, setNewAppName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Track loading state for Edit button per app
  const [editLoadingAppId, setEditLoadingAppId] = useState<string | null>(null);

  // Fetch apps on component mount
  useEffect(() => {
    dispatch(fetchApps());
  }, [dispatch]);

  // Fetch app agent sessions for each app when apps are loaded
  useEffect(() => {
    if (apps.length > 0) {
      apps.forEach((app) => {
        // Only fetch if we don't already have sessions for this app
        if (!sessions[app.id]) {
          dispatch(fetchAppAgentSessions(app.id));
        }
      });
    }
  }, [apps, sessions, dispatch]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
      dispatch(clearSessionsError());
    };
  }, [dispatch]);

  // Helper function to get session count for an app
  const getAppSessionCount = (appId: string) => {
    return sessions[appId]?.length || 0;
  };

  // Helper function to get the most recent active session for an app
  const getAppSessionStatus = useCallback(
    (appId: string) => {
      const appSessions = sessions[appId] || [];
      const activeSession = appSessions.find(
        (session) => session.status === "active",
      );
      return activeSession ? "active" : "stopped";
    },
    [sessions],
  );

  // Filter and sort apps based on current state
  const filteredAndSortedApps = useMemo(() => {
    let filteredApps = apps;

    // Apply search filter
    if (searchQuery) {
      filteredApps = filteredApps.filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Apply status filter based on agent session status
    if (statusFilter !== "all") {
      filteredApps = filteredApps.filter((app) => {
        const sessionStatus = getAppSessionStatus(app.id);
        return sessionStatus === statusFilter;
      });
    }

    // Apply sorting
    const sortedApps = [...filteredApps].sort((a, b) => {
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

    return sortedApps;
  }, [apps, searchQuery, statusFilter, sortBy, getAppSessionStatus]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(e.target.value));
  };

  const handleStatusChange = (value: string) => {
    dispatch(setStatusFilter(value as "all" | "active" | "stopped"));
  };

  const handleSortChange = (value: string) => {
    dispatch(setSortBy(value as "recent" | "name"));
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    try {
      // Create the app first
      const appResult = await dispatch(
        createApp({ name: newAppName.trim() }),
      ).unwrap();
      setNewAppName("");
      setShowCreateDialog(false);

      // Show session creation loading state
      setIsCreatingSession(true);

      // Create an agent session for the new app
      const sessionResult = await dispatch(
        createAppAgentSession(appResult.id),
      ).unwrap();

      // Navigate to the chat page
      navigate(
        `/apps/${appResult.id}/sessions/${sessionResult.session.id}/chat`,
      );
    } catch (error) {
      // Error is handled by Redux state
      console.error("Failed to create app or session:", error);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Helper to handle Edit button click
  const handleEditClick = async (appId: string) => {
    setEditLoadingAppId(appId);
    const appSessions = sessions[appId] || [];
    // Find active session
    const activeSession = appSessions.find((s) => s.status === "active");
    let sessionToGo: (typeof appSessions)[number] | null = null;
    if (activeSession) {
      sessionToGo = activeSession;
    } else if (appSessions.length > 0) {
      // Find latest session by created_on
      sessionToGo = [...appSessions].sort(
        (a, b) =>
          new Date(b.created_on).getTime() - new Date(a.created_on).getTime(),
      )[0];
    }
    try {
      if (!activeSession) {
        // No active session, create one
        const result = await dispatch(createAppAgentSession(appId)).unwrap();
        sessionToGo = result.session;
      }
      if (sessionToGo) {
        navigate(`/apps/${appId}/sessions/${sessionToGo.id}/chat`);
      } else {
        // No session found or created, fallback: create one
        const result = await dispatch(createAppAgentSession(appId)).unwrap();
        navigate(`/apps/${appId}/sessions/${result.session.id}/chat`);
      }
    } catch (e) {
      // Optionally show error

      console.error("Failed to start or find session", e);
    } finally {
      setEditLoadingAppId(null);
    }
  };

  if (error || sessionsError) {
    return (
      <div className="h-full flex flex-col">
        <div className="overflow-y-auto">
          <div className="p-8 mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-lg bg-red-50 border border-red-200 p-8 text-center">
                <h3 className="text-lg font-semibold mb-2 text-red-800">
                  Error
                </h3>
                <p className="text-red-600 mb-4">{error || sessionsError}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => dispatch(fetchApps())}>
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      dispatch(clearError());
                      dispatch(clearSessionsError());
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto">
        <div className="p-8 mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Apps</h1>
                <p className="text-muted-foreground">
                  Manage and create your data applications
                </p>
              </div>
              <Button
                className="flex items-center gap-2"
                onClick={() => setShowCreateDialog(true)}
                disabled={loading}
              >
                <Plus className="h-4 w-4" />
                New App
              </Button>
            </div>

            {/* Search and filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search apps..."
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

          {/* Create App Dialog */}
          {showCreateDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Create New App</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateDialog(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <form onSubmit={handleCreateApp}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                      placeholder="Enter app name"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!newAppName.trim() || loading}
                    >
                      {loading ? "Creating..." : "Create App"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Session Creation Loading Overlay */}
          {isCreatingSession && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">
                  Creating Agent Session
                </h3>
                <p className="text-muted-foreground">
                  Setting up your development environment...
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && apps.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <AppWindowMac className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-pulse" />
                <p className="text-muted-foreground">Loading apps...</p>
              </div>
            </div>
          )}

          {/* Apps Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedApps.map((app) => {
                const sessionStatus = getAppSessionStatus(app.id);
                const sessionCount = getAppSessionCount(app.id);

                return (
                  <div
                    key={app.id}
                    className="rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={`h-12 w-12 rounded-lg ${app.color} flex items-center justify-center text-white`}
                        >
                          <AppWindowMac className="h-6 w-6" />
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mb-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {app.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {app.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {app.lastModified}
                        </div>
                        <div className="flex items-center gap-1">
                          {sessionStatus === "active" ? (
                            <Play className="h-4 w-4 text-green-500" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-xs">
                            {sessionCount} session
                            {sessionCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              sessionStatus === "active"
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />
                          <span className="text-sm capitalize">
                            {sessionStatus}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(app.id)}
                          disabled={editLoadingAppId === app.id}
                        >
                          {editLoadingAppId === app.id ? "Loading..." : "Edit"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredAndSortedApps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-lg bg-muted p-8 text-center">
                <AppWindowMac className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {apps.length === 0
                    ? "No apps yet"
                    : "No apps match your filters"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {apps.length === 0
                    ? "Get started by creating your first data application"
                    : "Try adjusting your search or filter criteria"}
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create App
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
