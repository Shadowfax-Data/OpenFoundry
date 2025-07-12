import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store";
import { createApp } from "@/store/slices/appsSlice";
import { createAppAgentSession } from "@/store/slices/appAgentSessionsSlice";
import { ConnectionMultiSelect } from "@/components/connections/ConnectionMultiSelect";

interface CreateAppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatingSession: (isCreating: boolean) => void;
}

export function CreateAppDialog({
  isOpen,
  onClose,
  onCreatingSession,
}: CreateAppDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector((state) => state.apps);
  const { connections } = useAppSelector((state) => state.connections);

  const [newAppName, setNewAppName] = useState("");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>(
    [],
  );

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;

    try {
      // Create the app first
      const appResult = await dispatch(
        createApp({
          name: newAppName.trim(),
          connection_ids: selectedConnectionIds,
        }),
      ).unwrap();

      // Reset form
      setNewAppName("");
      setSelectedConnectionIds([]);
      onClose();

      // Show session creation loading state
      onCreatingSession(true);

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
      onCreatingSession(false);
    }
  };

  const handleClose = () => {
    setNewAppName("");
    setSelectedConnectionIds([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Create App Dialog */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create New App</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleCreateApp}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">App Name</label>
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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Connections
              </label>
              <ConnectionMultiSelect
                connections={connections}
                selectedConnectionIds={selectedConnectionIds}
                onSelectionChange={setSelectedConnectionIds}
                placeholder="Select connections..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newAppName.trim() || loading}>
                {loading ? "Creating..." : "Create App"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
