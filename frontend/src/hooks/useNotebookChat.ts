import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";

import {
  notebookChatSlice,
  selectCurrentNotebookWriteFileInfo,
  selectNotebookToolActivity,
} from "@/store/slices/notebookChatSlice";
import { RootState } from "@/store/types";

import { useBaseChat } from "./useBaseChat";
import {
  createAgentSession,
  fetchSessionDetails,
  saveWorkspace,
} from "./utils/agentSessionAPI";

interface UseNotebookChatProps {
  notebookId: string;
  sessionId: string;
  initialPrompt?: string;
  onNotebookToolActivity?: (toolName: string, isComplete: boolean) => void;
}

export const useNotebookChat = ({
  notebookId,
  sessionId,
  initialPrompt,
  onNotebookToolActivity,
}: UseNotebookChatProps) => {
  const welcomeMessage = initialPrompt
    ? "" // No welcome message if there's an initial prompt
    : "Welcome! I can help you with your Jupyter notebook. What would you like to work on today?";

  const chatProps = useBaseChat({
    resourceId: notebookId,
    sessionId,
    baseEndpoint: "/api/notebooks",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: notebookChatSlice.actions as any,
    chatSelector: (state: RootState) => state.notebookChat,
    selectCurrentWriteFileInfo: selectCurrentNotebookWriteFileInfo,
    welcomeMessage,
    initialPrompt,
  });

  const [notebookPreviewUrl, setNotebookPreviewUrl] = useState<string>("");

  // Monitor notebook tool activity
  const notebookToolActivity = useSelector(selectNotebookToolActivity);
  const [lastCompletedTool, setLastCompletedTool] = useState<string | null>(
    null,
  );

  // Detect when notebook tools start and complete
  useEffect(() => {
    if (notebookToolActivity) {
      // Tool is active
      if (onNotebookToolActivity) {
        onNotebookToolActivity(notebookToolActivity.toolName, false);
      }
    } else if (lastCompletedTool && onNotebookToolActivity) {
      // Tool just completed (transitioned from active to inactive)
      onNotebookToolActivity(lastCompletedTool, true);
      setLastCompletedTool(null);
    }

    // Track the current tool for completion detection
    if (notebookToolActivity) {
      setLastCompletedTool(notebookToolActivity.toolName);
    }
  }, [notebookToolActivity, lastCompletedTool, onNotebookToolActivity]);

  useEffect(() => {
    const loadSessionDetails = async () => {
      if (sessionId) {
        const data = await fetchSessionDetails({
          resourceType: "notebooks",
          resourceId: notebookId,
          sessionId,
        });

        if (data) {
          setNotebookPreviewUrl(data.preview_url || "");
        }
      }
    };

    loadSessionDetails();
  }, [notebookId, sessionId]);

  const exportNotebook = async () => {
    try {
      const response = await fetch(
        `/api/notebooks/${notebookId}/sessions/${sessionId}/export`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      toast.success("Notebook exported successfully.");
    } catch (error) {
      toast.error(
        `Failed to export notebook: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  };

  const handleCreateAgentSession = async () => {
    try {
      return await createAgentSession({
        resourceType: "notebooks",
        resourceId: notebookId,
      });
    } catch (error) {
      console.error("Failed to create agent session:", error);
      throw error;
    }
  };

  const handleSaveWorkspace = async () => {
    try {
      await saveWorkspace({
        resourceType: "notebooks",
        resourceId: notebookId,
        sessionId,
      });
      toast.success("Workspace saved successfully.");
    } catch (error) {
      toast.error(
        `Failed to save workspace: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  };

  return {
    ...chatProps,
    notebookPreviewUrl,
    exportNotebook,
    createAgentSession: handleCreateAgentSession,
    saveWorkspace: handleSaveWorkspace,
    notebookToolActivity, // Expose for debugging/monitoring
  };
};
