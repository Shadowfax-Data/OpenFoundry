import { useState } from "react";
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

  const handleSendMessage = (message: string) => {
    sendMessage(message);
  };

  // Show loading state while chat history is being fetched
  if (messages.length === 0 && !error) {
    return (
      <div className="h-full rounded-lg border bg-background flex items-center justify-center">
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
      <div className="h-full rounded-lg border bg-background flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Error loading chat</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full rounded-lg border"
    >
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
          <div className="flex-1 p-4">
            {activeTab === "preview" ? (
              <div className="h-full rounded-lg border bg-background p-4 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2" />
                  <p>Preview will appear here</p>
                  <p className="text-sm">
                    Start a conversation to see your app preview
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full rounded-lg border bg-background p-4">
                <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                  <Code className="h-8 w-8 mx-auto mb-2" />
                  <p>Generated code will appear here</p>
                  <p className="text-sm">
                    AI-generated code based on your conversation
                  </p>
                  {currentWriteFileInfo && (
                    <div className="mt-4 text-left w-full">
                      <h4 className="font-semibold mb-2">
                        Current File: {currentWriteFileInfo.fileName}
                      </h4>
                      <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-64">
                        {currentWriteFileInfo.content}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
