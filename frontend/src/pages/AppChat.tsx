import { useState, useEffect } from "react";
import { useParams } from "react-router";
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
} from "@/store/slices/appAgentSessionsSlice";
import { AppBuilderPanel } from "@/components/app/AppBuilderPanel";
import { toast } from "sonner";

export function AppChat() {
  const { appId, sessionId } = useParams<{
    appId: string;
    sessionId: string;
  }>();
  const [isSandboxReady, setIsSandboxReady] = useState(false);
  const {
    messages,
    isStreaming,
    error,
    currentWriteFileInfo,
    saveWorkspace,
    sendMessage,
  } = useAppChat({
    appId: appId!,
    sessionId: sessionId!,
  });

  const session = useAppSelector(selectAppAgentSessionById(appId!, sessionId!));
  const previewUrl = session?.app_port
    ? `${window.location.protocol}//${window.location.hostname}:${session.app_port}/`
    : undefined;

  const dispatch = useAppDispatch();

  // Ensure sessions are loaded for this appId
  useEffect(() => {
    if (appId && sessionId && !session) {
      dispatch(fetchAppAgentSessions(appId));
    }
  }, [appId, sessionId, session, dispatch]);

  // Health check for sandbox
  useEffect(() => {
    if (!appId || !sessionId || messages.length === 0 || error) {
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
  }, [appId, sessionId, messages.length, error]);

  const handleSendMessage = (message: string) => {
    sendMessage(message);
  };

  const handleSaveWorkspace = async () => {
    try {
      await saveWorkspace();
      toast.success("Workspace saved successfully.");
    } catch (error) {
      toast.error(
        `Failed to save workspace: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
      {/* Mobile/Tablet View - Only Conversation Panel */}
      <div className="md:hidden h-full">
        <ChatConversation
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          onSendMessage={handleSendMessage}
          placeholder="Type your message..."
          title="Conversation"
          className="h-full"
          disabled={!isSandboxReady || isStreaming}
        />
      </div>

      {/* Desktop View - Resizable Panels */}
      <div className="hidden md:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Chat Messages */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <ChatConversation
              messages={messages}
              isStreaming={isStreaming}
              error={error}
              onSendMessage={handleSendMessage}
              placeholder="Type your message..."
              title="Conversation"
              className="h-full border-0"
              disabled={!isSandboxReady || isStreaming}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Preview/Code Tabs */}
          <ResizablePanel defaultSize={70}>
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
                saveWorkspace={handleSaveWorkspace}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
