import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, BotMessageSquare } from "lucide-react";

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatConversationProps {
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
}

export function ChatConversation({
  messages = [],
  onSendMessage,
  placeholder = "Type your message...",
  title = "Conversation",
  className = "",
}: ChatConversationProps) {
  const [message, setMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    onSendMessage?.(message);
    setMessage("");
  };

  return (
    <div
      className={`w-full bg-background rounded-lg border flex flex-col ${className}`}
    >
      {/* Chat Header */}
      <div className="px-4 py-2 border-b flex items-center h-10">
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex justify-start gap-3">
              {/* Message Badge Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    msg.isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {msg.isUser ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <BotMessageSquare className="h-3 w-3" />
                  )}
                </div>
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{msg.content}</p>
                <span className="text-xs text-muted-foreground mt-1 block">
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
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="sm" disabled={!message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
