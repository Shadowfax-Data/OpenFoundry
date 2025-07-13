import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchConnections } from "@/store/slices/connectionsSlice";
import { fetchApp } from "@/store/slices/appsSlice";
import { ConnectionMultiSelect } from "@/components/connections/ConnectionMultiSelect";
import { toast } from "sonner";

interface ManageConnectionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appId: string;
  sessionId: string;
}

export function ManageConnectionsDialog({
  isOpen,
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

  // Always fetch connections and the latest app data when dialog opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchConnections());
      dispatch(fetchApp(appId));
    }
  }, [isOpen, dispatch, appId]);

  // Set selected connections after app data is loaded
  useEffect(() => {
    if (isOpen && currentApp && currentApp.connections) {
      // Ensure all IDs are strings
      const existingConnectionIds = currentApp.connections.map((conn) =>
        String(conn.id),
      );
      setSelectedConnectionIds(existingConnectionIds);
    }
  }, [isOpen, currentApp]);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Manage Connections Dialog */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Manage Connections</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleUpdateConnections}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select Connections
              </label>
              <ConnectionMultiSelect
                connections={connections}
                selectedConnectionIds={selectedConnectionIds}
                onSelectionChange={setSelectedConnectionIds}
                placeholder="Select connections for this app..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || isAdding}>
                {isAdding ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
