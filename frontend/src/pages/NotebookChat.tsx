import { useCallback, useEffect, useRef, useState } from "react";
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
  const [initialPromptSent, setInitialPromptSent] = useState(false);

  // Extract prompt from query params
  const prompt = searchParams.get("prompt")?.trim() || "";

  // Event-driven notebook refresh system
  const [isAgentWorkingOnNotebook, setIsAgentWorkingOnNotebook] =
    useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notebookContainerRef = useRef<HTMLDivElement | null>(null);

  const notebookOps = useNotebookOperations({
    notebookId: notebookId!,
    sessionId: sessionId!,
    autoLoad: isSandboxReady,
  });

  // Auto-scroll to latest cell
  const scrollToLatestCell = useCallback(() => {
    if (notebookContainerRef.current) {
      // Find the last cell element
      const cellElements =
        notebookContainerRef.current.querySelectorAll("[data-cell-index]");
      if (cellElements.length > 0) {
        const lastCell = cellElements[cellElements.length - 1];
        lastCell.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  // Handle notebook tool activity with immediate refresh
  const handleNotebookToolActivity = (
    toolName: string,
    isComplete: boolean,
  ) => {
    if (!isComplete) {
      // Tool started
      setIsAgentWorkingOnNotebook(true);
      console.log(`Notebook tool started: ${toolName}`);
    } else {
      // Tool completed - trigger immediate refresh
      console.log(`Notebook tool completed: ${toolName} - refreshing notebook`);

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Immediate refresh
      notebookOps.getNotebook();

      // Set a timeout to stop the working indicator and do one final refresh
      refreshTimeoutRef.current = setTimeout(() => {
        setIsAgentWorkingOnNotebook(false);
        // Final refresh to catch any delayed changes
        notebookOps.getNotebook();
        // Auto-scroll to latest cell after refresh
        setTimeout(scrollToLatestCell, 100);
      }, 2000);
    }
  };

  const { messages, isStreaming, error, sendMessage } = useNotebookChat({
    notebookId: notebookId!,
    sessionId: sessionId!,
    onNotebookToolActivity: handleNotebookToolActivity,
  });

  const session = useAppSelector(
    selectNotebookAgentSessionById(notebookId!, sessionId!),
  );

  // Ensure sessions are loaded for this notebookId
  useEffect(() => {
    if (notebookId && sessionId && !session) {
      dispatch(fetchNotebookAgentSessions(notebookId));
    }
  }, [notebookId, sessionId, session, dispatch]);

  // Auto-scroll when notebook data changes (new cells added)
  useEffect(() => {
    if (
      notebookOps.notebookData?.cells &&
      notebookOps.notebookData.cells.length > 0
    ) {
      // Small delay to ensure DOM is updated
      setTimeout(scrollToLatestCell, 200);
    }
  }, [notebookOps.notebookData?.cells, scrollToLatestCell]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

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
  }, [notebookId, sessionId]);

  // Send initial prompt when sandbox is ready
  useEffect(() => {
    if (isSandboxReady && prompt && !initialPromptSent) {
      sendMessage(prompt);
      setInitialPromptSent(true);

      // Remove the prompt from URL to prevent re-sending on refresh
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("prompt");
      const newUrl = newSearchParams.toString()
        ? `?${newSearchParams.toString()}`
        : "";
      navigate(`/notebooks/${notebookId}/sessions/${sessionId}/chat${newUrl}`, {
        replace: true,
      });
    }
  }, [
    isSandboxReady,
    prompt,
    initialPromptSent,
    sendMessage,
    navigate,
    searchParams,
    notebookId,
    sessionId,
  ]);

  const handleResetChat = async () => {
    if (!notebookId || !sessionId) return;

    setIsResetting(true);
    try {
      // Stop the current session
      await dispatch(
        stopNotebookAgentSession({ notebookId, sessionId }),
      ).unwrap();

      // Create a new session
      const result = await dispatch(
        createNotebookAgentSession(notebookId),
      ).unwrap();

      // Navigate to the new session
      navigate(`/notebooks/${notebookId}/sessions/${result.session.id}/chat`);

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
                {isAgentWorkingOnNotebook && (
                  <p className="text-xs mt-2">🔄 Agent updating notebook...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full relative" ref={notebookContainerRef}>
              {isAgentWorkingOnNotebook && (
                <div className="absolute top-2 right-2 z-10 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs">
                  🔄 Syncing...
                </div>
              )}
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
                onStopExecution={notebookOps.stopExecution}
                onRerunNotebook={notebookOps.rerunNotebook}
                onSaveWorkspace={async () => {
                  if (!notebookId || !sessionId) return;

                  try {
                    const response = await fetch(
                      `/api/notebooks/${notebookId}/sessions/${sessionId}/save`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      },
                    );

                    if (response.ok) {
                      const result = await response.json();
                      toast.success(
                        result.message || "Notebook saved successfully",
                      );
                    } else {
                      const error = await response.text();
                      toast.error(`Failed to save notebook: ${error}`);
                    }
                  } catch (error) {
                    console.error("Error saving notebook:", error);
                    toast.error("Failed to save notebook");
                  }
                }}
              />
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
