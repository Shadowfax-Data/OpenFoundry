import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  appChatSlice,
  selectCurrentAppWriteFileInfo,
} from "@/store/slices/appChatSlice";
import { RootState } from "@/store/types";

import { useBaseChat } from "./useBaseChat";
import {
  createAgentSession,
  fetchSessionDetails,
  saveWorkspace,
} from "./utils/agentSessionAPI";

interface UseAppChatProps {
  appId: string;
  sessionId: string;
  initialPrompt?: string;
}

export const useAppChat = ({
  appId,
  sessionId,
  initialPrompt,
}: UseAppChatProps) => {
  const welcomeMessage = initialPrompt
    ? "" // No welcome message if there's an initial prompt
    : "Welcome! What would you like to do today?";

  const chatProps = useBaseChat({
    resourceId: appId,
    sessionId,
    baseEndpoint: "/api/apps",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: appChatSlice.actions as any,
    chatSelector: (state: RootState) => state.appChat,
    selectCurrentWriteFileInfo: selectCurrentAppWriteFileInfo,
    welcomeMessage,
    initialPrompt,
  });

  const [appPreviewUrl, setAppPreviewUrl] = useState<string>("");
  const [appPreviewToken, setAppPreviewToken] = useState<string>("");

  useEffect(() => {
    const loadSessionDetails = async () => {
      if (sessionId) {
        const data = await fetchSessionDetails({
          resourceType: "apps",
          resourceId: appId,
          sessionId,
        });

        if (data) {
          setAppPreviewUrl(data.preview_url || "");
          setAppPreviewToken(data.preview_token || "");
        }
      }
    };

    loadSessionDetails();
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

  const handleCreateAgentSession = async () => {
    try {
      return await createAgentSession({
        resourceType: "apps",
        resourceId: appId,
      });
    } catch (error) {
      console.error("Failed to create agent session:", error);
      throw error;
    }
  };

  const handleSaveWorkspace = async () => {
    try {
      await saveWorkspace({
        resourceType: "apps",
        resourceId: appId,
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
    appPreviewUrl,
    appPreviewToken,
    deployApp,
    createAgentSession: handleCreateAgentSession,
    saveWorkspace: handleSaveWorkspace,
  };
};
