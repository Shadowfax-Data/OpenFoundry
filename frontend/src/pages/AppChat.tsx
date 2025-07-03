import { useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Eye, Code, MoreVertical } from "lucide-react";
import { ChatConversation, ChatMessage } from "@/components/ChatConversation";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

export function AppChat() {
  const { appId } = useParams<{ appId: string }>();
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  // Mock chat messages for demonstration
  const messages: ChatMessage[] = [
    {
      id: "1",
      content: "Create a simple dashboard component " + appId,
      isUser: true,
      timestamp: "2 minutes ago",
    },
    {
      id: "2",
      content:
        "I'll create a dashboard component for you with charts and metrics.",
      isUser: false,
      timestamp: "1 minute ago",
    },
  ];

  const handleSendMessage = (message: string) => {
    // TODO: Implement message sending logic
    console.log("Sending message:", message);
  };

  return (
    <div className="h-full bg-sidebar">
      <div className="h-full p-2">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full rounded-lg border"
        >
          {/* Left Panel - Chat Messages */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <ChatConversation
              messages={messages}
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
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
