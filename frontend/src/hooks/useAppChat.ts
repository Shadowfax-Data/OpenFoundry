import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  appChatSlice,
  selectCurrentAppWriteFileInfo,
} from "@/store/slices/appChatSlice";
import { RootState } from "@/store/types";

import { useBaseChat } from "./useBaseChat";

interface UseAppChatProps {
  appId: string;
  sessionId: string;
}

export const useAppChat = ({ appId, sessionId }: UseAppChatProps) => {
  const chatProps = useBaseChat({
    resourceId: appId,
    sessionId,
    baseEndpoint: "/api/apps",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: appChatSlice.actions as any,
    chatSelector: (state: RootState) => state.appChat,
    selectCurrentWriteFileInfo: selectCurrentAppWriteFileInfo,
    welcomeMessage: "Welcome! What would you like to do today?",
  });

  const [appPreviewUrl, setAppPreviewUrl] = useState<string>("");
  const [appPreviewToken, setAppPreviewToken] = useState<string>("");

  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (sessionId) {
        try {
          const response = await fetch(
            `/api/apps/${appId}/sessions/${sessionId}`,
          );
          if (response.ok) {
            const data = await response.json();
            // Note: These fields might not exist in your current API response
            // You can add them later when implementing preview functionality
            setAppPreviewUrl(data.preview_url || "");
            setAppPreviewToken(data.preview_token || "");
          }
        } catch (error) {
          console.error("Failed to fetch app session details:", error);
        }
      }
    };

    fetchSessionDetails();
  }, [appId, sessionId]);

  const deployApp = async () => {
    try {
      const response = await fetch(
        `/api/apps/${appId}/sessions/${sessionId}/deploy`,
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
      // You can add toast notifications here when you implement them
      console.log("App deployed successfully");
    } catch (error) {
      console.error("Failed to deploy app:", error);
      throw error;
    }
  };

  const createAgentSession = async () => {
    try {
      const response = await fetch(`/api/apps/${appId}/sessions`, {
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
        `/api/apps/${appId}/sessions/${sessionId}/save`,
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
    appPreviewUrl,
    appPreviewToken,
    deployApp,
    createAgentSession,
    saveWorkspace,
  };
};
