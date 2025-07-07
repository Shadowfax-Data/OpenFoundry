import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Database } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchConnections,
  deleteConnection,
  setConnectionsSearchQuery,
  setConnectionsSortBy,
  clearConnectionsError,
} from "@/store/slices/connectionsSlice";
import { ConnectionCard } from "@/components/connections/ConnectionCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IconBrandSnowflake } from "@tabler/icons-react";

export function Connections() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { connections, loading, error, searchQuery, sortBy } = useAppSelector(
    (state) => state.connections,
  );

  useEffect(() => {
    dispatch(fetchConnections());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(clearConnectionsError());
    };
  }, [dispatch]);

  const filteredAndSortedConnections = useMemo(() => {
    let filtered = connections;

    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      // "recent" is default, but we don't have a date field yet.
      // Once we do, we can sort by it. For now, it's just by name.
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [connections, searchQuery, sortBy]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setConnectionsSearchQuery(e.target.value));
  };

  const handleSortChange = (value: string) => {
    dispatch(setConnectionsSortBy(value as "recent" | "name"));
  };

  const handleDelete = (connectionId: string) => {
    if (window.confirm("Are you sure you want to delete this connection?")) {
      dispatch(deleteConnection(connectionId));
    }
  };

  const handleEdit = (connectionId: string) => {
    // TODO: Implement edit functionality. This would likely involve:
    // 1. Opening a sheet/dialog, similar to the create form.
    // 2. Fetching the specific connection details (since private keys aren't sent in the list).
    // 3. Populating the form with the details.
    // 4. Dispatching an `updateConnection` action on save.
    alert(
      `Edit functionality for connection ${connectionId} is not yet implemented.`,
    );
  };

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="overflow-y-auto">
          <div className="p-8 mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-lg bg-red-50 border border-red-200 p-8 text-center">
                <h3 className="text-lg font-semibold mb-2 text-red-800">
                  Error
                </h3>
                <p className="text-red-600 mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => dispatch(fetchConnections())}>
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => dispatch(clearConnectionsError())}
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
                <h1 className="text-3xl font-bold">Connections</h1>
                <p className="text-muted-foreground">
                  Manage your data source connections
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Connection
                  </Button>
                </DialogTrigger>
                <DialogContent showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>Add New Connection</DialogTitle>
                    <DialogDescription>
                      Select a connection type to add.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-2">
                    <div
                      className="p-4 border rounded-md cursor-pointer hover:bg-muted"
                      onClick={() => navigate("/connections/snowflake/new")}
                    >
                      <div className="flex items-center gap-3">
                        <IconBrandSnowflake />
                        <div>
                          <span className="font-semibold">Snowflake</span>
                          <p className="text-sm text-muted-foreground">
                            Connect to a Snowflake data warehouse.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search and filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none"
                />
              </div>
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

          {/* Loading state */}
          {loading && connections.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Database className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-pulse" />
                <p className="text-muted-foreground">Loading connections...</p>
              </div>
            </div>
          )}

          {/* Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedConnections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredAndSortedConnections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-lg bg-muted p-8 text-center">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  {connections.length === 0
                    ? "No connections yet"
                    : "No connections match your filters"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {connections.length === 0
                    ? "Get started by creating your first connection"
                    : "Try adjusting your search or filter criteria"}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Connection
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Connection</DialogTitle>
                      <DialogDescription>
                        Select a connection type to add.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                      <div
                        className="p-4 border rounded-md cursor-pointer hover:bg-muted"
                        onClick={() => navigate("/connections/snowflake/new")}
                      >
                        <div className="flex items-center gap-3">
                          <IconBrandSnowflake />
                          <div>
                            <span className="font-semibold">Snowflake</span>
                            <p className="text-sm text-muted-foreground">
                              Connect to a Snowflake data warehouse.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
