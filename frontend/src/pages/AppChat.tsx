import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Eye, Code, MoreVertical } from "lucide-react";
import { ChatConversation } from "@/components/chat/ChatConversation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useAppChat } from "@/hooks/useAppChat";
import { AppPreview } from "@/components/app/AppPreview";
import { CodePanel } from "@/components/code/CodePanel";
import { useAppSelector, useAppDispatch } from "@/store";
import {
  selectAppAgentSessionById,
  fetchAppAgentSessions,
} from "@/store/slices/appAgentSessionsSlice";

export function AppChat() {
  const { appId, sessionId } = useParams<{
    appId: string;
    sessionId: string;
  }>();
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  const { messages, isStreaming, error, sendMessage, currentWriteFileInfo } =
    useAppChat({
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

  const handleSendMessage = (message: string) => {
    sendMessage(message);
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
          className="h-full border-0 rounded-l-lg"
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Right Panel - Preview/Code Tabs */}
      <ResizablePanel defaultSize={70}>
        <div className="h-full bg-background rounded-r-lg border-0 flex flex-col">
          {/* Top Navigation Tabs */}
          <div className="border-b px-4 py-2 flex items-center h-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h1 className="text-sm font-semibold">App Builder</h1>
                <div className="flex bg-muted rounded-lg p-1">
                  <Button
                    variant={activeTab === "preview" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("preview")}
                    className="h-6 text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant={activeTab === "code" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab("code")}
                    className="h-6 text-xs"
                  >
                    <Code className="h-3 w-3 mr-1" />
                    Code
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1">
            {activeTab === "preview" ? (
              <AppPreview previewUrl={previewUrl} />
            ) : (
              <CodePanel currentWriteFileInfo={currentWriteFileInfo} />
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
