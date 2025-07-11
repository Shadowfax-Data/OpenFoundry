import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChatConversation } from "@/components/chat/ChatConversation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useAppChat } from "@/hooks/useAppChat";
import { useAppSelector, useAppDispatch } from "@/store";
import {
  selectAppAgentSessionById,
  fetchAppAgentSessions,
  deleteAppAgentSession,
  createAppAgentSession,
} from "@/store/slices/appAgentSessionsSlice";
import { AppBuilderPanel } from "@/components/app/AppBuilderPanel";
import { toast } from "sonner";

export function AppChat() {
  const { appId, sessionId } = useParams<{
    appId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isSandboxReady, setIsSandboxReady] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const {
    messages,
    isStreaming,
    error,
    currentWriteFileInfo,
    sendMessage,
    saveWorkspace,
  } = useAppChat({
    appId: appId!,
    sessionId: sessionId!,
  });

  const session = useAppSelector(selectAppAgentSessionById(appId!, sessionId!));
  const previewUrl = session?.app_port
    ? `${window.location.protocol}//${window.location.hostname}:${session.app_port}/`
    : undefined;

  // Ensure sessions are loaded for this appId
  useEffect(() => {
    if (appId && sessionId && !session) {
      dispatch(fetchAppAgentSessions(appId));
    }
  }, [appId, sessionId, session, dispatch]);

  // Health check for sandbox - only run once at the beginning
  useEffect(() => {
    if (!appId || !sessionId) {
      return;
    }

    setIsSandboxReady(false);

    const checkSandboxHealth = async () => {
      const response = await fetch(
        `/api/apps/${appId}/sessions/${sessionId}/sandbox_health`,
      );
      if (response.ok) {
        setIsSandboxReady(true);
        return true;
      }
      return false;
    };

    const intervalId = setInterval(async () => {
      const isReady = await checkSandboxHealth();
      if (isReady) {
        clearInterval(intervalId);
      }
    }, 2000);

    // Initial check
    checkSandboxHealth().then((isReady) => {
      if (isReady) {
        clearInterval(intervalId);
      }
    });

    return () => clearInterval(intervalId);
  }, [appId, sessionId]); // Only depend on appId and sessionId

  const handleResetChat = async () => {
    if (!appId || !sessionId) return;

    setIsResetting(true);
    try {
      // Delete the current session
      await dispatch(deleteAppAgentSession({ appId, sessionId })).unwrap();

      // Create a new session
      const result = await dispatch(createAppAgentSession(appId)).unwrap();

      // Navigate to the new session
      navigate(`/apps/${appId}/sessions/${result.session.id}/chat`);

      toast.success("Chat reset successfully. New session created.");
    } catch (error) {
      console.error("Failed to reset chat:", error);
      toast.error(
        `Failed to reset chat: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsResetting(false);
    }
  };

  // Show loading state while chat history is being fetched
  if (messages.length === 0 && !error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading chat history...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Error loading chat</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Chat Panel - Full width on mobile, left panel on desktop */}
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className="md:max-w-none max-w-full"
        >
          <ChatConversation
            messages={messages}
            isStreaming={isStreaming}
            error={error}
            onSendMessage={sendMessage}
            placeholder="Type your message..."
            title="Conversation"
            className="h-full"
            disabled={!isSandboxReady || isStreaming}
            onResetChat={handleResetChat}
            isResetting={isResetting}
          />
        </ResizablePanel>

        {/* Resizable Handle - Hidden on mobile */}
        <ResizableHandle withHandle className="hidden md:flex" />

        {/* Right Panel - Hidden on mobile, visible on desktop */}
        <ResizablePanel defaultSize={70} className="hidden md:block">
          {!isSandboxReady ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Waiting for sandbox to become ready...</p>
              </div>
            </div>
          ) : (
            <AppBuilderPanel
              previewUrl={previewUrl}
              appId={appId!}
              sessionId={sessionId!}
              currentWriteFileInfo={currentWriteFileInfo}
              saveWorkspace={saveWorkspace}
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
