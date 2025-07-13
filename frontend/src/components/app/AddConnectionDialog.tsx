import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchConnections } from "@/store/slices/connectionsSlice";
import { ConnectionMultiSelect } from "@/components/connections/ConnectionMultiSelect";
import { toast } from "sonner";

interface AddConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appId: string;
  sessionId: string;
}

export function AddConnectionDialog({
  isOpen,
  onClose,
  appId,
  sessionId,
}: AddConnectionDialogProps) {
  const dispatch = useAppDispatch();
  const { connections, loading } = useAppSelector((state) => state.connections);
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>(
    [],
  );
  const [isAdding, setIsAdding] = useState(false);

  // Fetch connections when dialog opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchConnections());
    }
  }, [isOpen, dispatch]);

  const handleAddConnections = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedConnectionIds.length === 0) return;

    setIsAdding(true);
    try {
      // Add each selected connection to the app session
      for (const connectionId of selectedConnectionIds) {
        const response = await fetch(
          `/api/apps/${appId}/sessions/${sessionId}/add_connection`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ connection_id: connectionId }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to add connection");
        }
      }

      // Reset form and close dialog
      setSelectedConnectionIds([]);
      onClose();
      toast.success("Connections added successfully");
    } catch (error) {
      console.error("Failed to add connections:", error);
      toast.error(
        `Failed to add connections: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      {/* Add Connection Dialog */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add Connections</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleAddConnections}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Select Connections
              </label>
              <ConnectionMultiSelect
                connections={connections}
                selectedConnectionIds={selectedConnectionIds}
                onSelectionChange={setSelectedConnectionIds}
                placeholder="Select connections to add..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  selectedConnectionIds.length === 0 || loading || isAdding
                }
              >
                {isAdding ? "Adding..." : "Add Connections"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
