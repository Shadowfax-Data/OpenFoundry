import { useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Eye, Code, MoreVertical } from "lucide-react";

export function AppChat() {
  const { appId } = useParams<{ appId: string }>();
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [message, setMessage] = useState("");

  // Mock chat messages for demonstration
  const messages = [
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // TODO: Implement message sending logic
    console.log("Sending message:", message);
    setMessage("");
  };

  return (
    <div className="h-full bg-sidebar">
      <div className="flex h-full gap-2">
        {/* Left Panel - Chat Messages */}
        <div className="w-96 bg-background rounded-lg border flex flex-col">
          {/* Chat Header */}
          <div className="px-4 py-2 border-b flex items-center h-10">
            <h2 className="font-semibold text-sm">Conversation</h2>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="sm" disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Panel - Preview/Code Tabs */}
        <div className="flex-1 bg-background rounded-lg border flex flex-col">
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
      </div>
    </div>
  );
}
