import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

export function Apps() {
  const dispatch = useAppDispatch();
  const { apps, loading, error, searchQuery, statusFilter, sortBy } =
    useAppSelector((state) => state.apps);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAppName, setNewAppName] = useState("");

  // Fetch apps on component mount
  useEffect(() => {
    dispatch(fetchApps());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

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

    // Apply status filter
    if (statusFilter !== "all") {
      filteredApps = filteredApps.filter((app) => app.status === statusFilter);
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
  }, [apps, searchQuery, statusFilter, sortBy]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(e.target.value));
  };

  const handleStatusChange = (value: string) => {
    dispatch(setStatusFilter(value as "all" | "active" | "draft"));
  };

  const handleSortChange = (value: string) => {
    dispatch(setSortBy(value as "recent" | "name"));
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    try {
      await dispatch(createApp({ name: newAppName.trim() })).unwrap();
      setNewAppName("");
      setShowCreateDialog(false);
    } catch (error) {
      // Error is handled by Redux state
      console.error("Failed to create app:", error);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-lg bg-red-50 border border-red-200 p-8 text-center">
            <h3 className="text-lg font-semibold mb-2 text-red-800">Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => dispatch(fetchApps())}>Try Again</Button>
              <Button variant="outline" onClick={() => dispatch(clearError())}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
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
              <SelectItem value="draft">Draft Only</SelectItem>
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
                <Button type="submit" disabled={!newAppName.trim() || loading}>
                  {loading ? "Creating..." : "Create App"}
                </Button>
              </div>
            </form>
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
          {filteredAndSortedApps.map((app) => (
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
                  <h3 className="font-semibold text-lg mb-2">{app.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {app.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {app.lastModified}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        app.status === "active"
                          ? "bg-green-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-sm capitalize">{app.status}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredAndSortedApps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="rounded-lg bg-muted p-8 text-center">
            <AppWindowMac className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {apps.length === 0 ? "No apps yet" : "No apps match your filters"}
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
  );
}
