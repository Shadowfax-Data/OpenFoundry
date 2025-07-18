import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  notebookChatSlice,
  selectCurrentNotebookWriteFileInfo,
} from "@/store/slices/notebookChatSlice";
import { RootState } from "@/store/types";

import { useBaseChat } from "./useBaseChat";

interface UseNotebookChatProps {
  notebookId: string;
  sessionId: string;
  initialPrompt?: string;
}

export const useNotebookChat = ({
  notebookId,
  sessionId,
  initialPrompt,
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

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (sessionId) {
        try {
          const response = await fetch(
            `/api/notebooks/${notebookId}/sessions/${sessionId}`,
          );
          if (response.ok) {
            const data = await response.json();
            // Note: These fields might not exist in your current API response
            // You can add them later when implementing preview functionality
            setNotebookPreviewUrl(data.preview_url || "");
          }
        } catch (error) {
          console.error("Failed to fetch notebook session details:", error);
        }
      }
    };

    fetchSessionDetails();
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

  const createAgentSession = async () => {
    try {
      const response = await fetch(`/api/notebooks/${notebookId}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const session = await response.json();
      return session;
    } catch (error) {
      console.error("Failed to create agent session:", error);
      throw error;
    }
  };

  const saveWorkspace = async () => {
    try {
      const response = await fetch(
        `/api/notebooks/${notebookId}/sessions/${sessionId}/save`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
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
    createAgentSession,
    saveWorkspace,
  };
};
