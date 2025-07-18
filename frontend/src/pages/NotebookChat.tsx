import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { ChatConversation } from "@/components/chat/ChatConversation";
import { InteractiveNotebook } from "@/components/code/InteractiveNotebook";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useNotebookChat } from "@/hooks/useNotebookChat";
import { useNotebookOperations } from "@/hooks/useNotebookOperations";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  createNotebookAgentSession,
  fetchNotebookAgentSessions,
  selectNotebookAgentSessionById,
  stopNotebookAgentSession,
} from "@/store/slices/notebookAgentSessionsSlice";

export function NotebookChat() {
  const { notebookId, sessionId } = useParams<{
    notebookId: string;
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isSandboxReady, setIsSandboxReady] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [searchParams] = useSearchParams();

  // Extract prompt from query params
  const prompt = searchParams.get("prompt")?.trim() || "";

  const {
    messages,
    isStreaming,
    error,
    sendMessage,
  } = useNotebookChat({
    notebookId: notebookId!,
    sessionId: sessionId!,
    initialPrompt: prompt,
  });

  const notebookOps = useNotebookOperations({
    notebookId: notebookId!,
    sessionId: sessionId!,
    autoLoad: isSandboxReady, // Only load after sandbox is ready
  });

  const session = useAppSelector(
    selectNotebookAgentSessionById(notebookId!, sessionId!)
  );

  // Ensure sessions are loaded for this notebookId
  useEffect(() => {
    if (notebookId && sessionId && !session) {
      dispatch(fetchNotebookAgentSessions(notebookId));
    }
  }, [notebookId, sessionId, session, dispatch]);

  // Health check for sandbox - only run once at the beginning
  useEffect(() => {
    if (!notebookId || !sessionId) {
      return;
    }

    setIsSandboxReady(false);

    const checkSandboxHealth = async () => {
      const response = await fetch(
        `/api/notebooks/${notebookId}/sessions/${sessionId}/status`,
      );
      if (response.ok) {
        const status = await response.json();
        const isReady = status.overall_ready === true;
        setIsSandboxReady(isReady);
        return isReady;
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
  }, [notebookId, sessionId]); // Only depend on notebookId and sessionId

  const handleResetChat = async () => {
    if (!notebookId || !sessionId) return;

    setIsResetting(true);
    try {
      // Stop the current session
      await dispatch(
        stopNotebookAgentSession({ notebookId, sessionId })
      ).unwrap();

      // Create a new session
      const result = await dispatch(
        createNotebookAgentSession(notebookId)
      ).unwrap();

      // Navigate to the new session
      navigate(
        `/notebooks/${notebookId}/sessions/${result.session.id}/chat`
      );

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
            title="Notebook Assistant"
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
            <InteractiveNotebook
              notebookData={notebookOps.notebookData}
              kernelStatus={notebookOps.kernelStatus}
              loading={notebookOps.loading}
              error={notebookOps.error}
              executingCells={notebookOps.executingCells}
              onExecuteCell={notebookOps.executeCellWithStatus}
              onUpdateCell={notebookOps.updateCell}
              onAddCell={notebookOps.addCell}
              onDeleteCell={notebookOps.deleteCell}
              onRestartKernel={notebookOps.restartKernel}
              onRerunNotebook={notebookOps.rerunNotebook}
              onSaveWorkspace={async () => {
                console.log('Save workspace functionality can be added here');
              }}
            />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
