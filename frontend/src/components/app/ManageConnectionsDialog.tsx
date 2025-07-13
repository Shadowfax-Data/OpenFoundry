import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchConnections } from "@/store/slices/connectionsSlice";
import { fetchApp } from "@/store/slices/appsSlice";
import { ConnectionMultiSelect } from "@/components/connections/ConnectionMultiSelect";
import { toast } from "sonner";

interface ManageConnectionsDialogProps {
  onClose: () => void;
  appId: string;
  sessionId: string;
}

export function ManageConnectionsDialog({
  onClose,
  appId,
  sessionId,
}: ManageConnectionsDialogProps) {
  const dispatch = useAppDispatch();
  const { connections, loading } = useAppSelector((state) => state.connections);
  const { apps } = useAppSelector((state) => state.apps);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>(
    [],
  );
  const [isAdding, setIsAdding] = useState(false);

  // Get the current app data
  const currentApp = apps.find((app) => app.id === appId);

  // Always fetch connections and the latest app data when dialog mounts
  useEffect(() => {
    dispatch(fetchConnections());
    dispatch(fetchApp(appId));
  }, [dispatch, appId]);

  // Set selected connections after app data is loaded
  useEffect(() => {
    if (currentApp && currentApp.connections) {
      // Ensure all IDs are strings
      const existingConnectionIds = currentApp.connections.map((conn) =>
        String(conn.id),
      );
      setSelectedConnectionIds(existingConnectionIds);
    }
  }, [currentApp]);

  const handleUpdateConnections = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsAdding(true);
    try {
      // Update all connections for the app session
      const response = await fetch(
        `/api/apps/${appId}/sessions/${sessionId}/connections`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ connection_ids: selectedConnectionIds }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update connections");
      }

      const result = await response.json();

      // Reset form and close dialog
      setSelectedConnectionIds([]);
      onClose();

      // Refresh the app data to reflect the updated connections
      await dispatch(fetchApp(appId));

      const message = result.message || "Connections updated successfully";
      toast.success(message);
    } catch (error) {
      console.error("Failed to update connections:", error);
      toast.error(
        `Failed to update connections: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedConnectionIds([]);
    onClose();
  };

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Connections</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdateConnections}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {selectedConnectionIds.length === 0
                ? "No connections selected"
                : selectedConnectionIds.length === 1
                  ? "1 connection selected"
                  : `${selectedConnectionIds.length} connections selected`}
            </label>
            <ConnectionMultiSelect
              connections={connections}
              selectedConnectionIds={selectedConnectionIds}
              onSelectionChange={setSelectedConnectionIds}
              placeholder="Select connections for this app..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || isAdding}>
              {isAdding ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
