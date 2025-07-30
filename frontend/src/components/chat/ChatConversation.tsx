import { RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Message } from "@/store/slices/chatSliceFactory";

import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

interface ChatConversationProps {
  title?: string;
  messages: Message[];
  isStreaming: boolean;
  error?: string | null;
  onSendMessage: (
    message: string,
    model?: string,
    images?: string[],
  ) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onResetChat?: () => Promise<void> | void;
  isResetting?: boolean;
}

export function ChatConversation({
  title = "Conversation",
  messages,
  isStreaming,
  error,
  onSendMessage,
  placeholder = "Type your message…",
  className = "",
  disabled = false,
  onResetChat,
  isResetting = false,
}: ChatConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(messages.length);

  // Auto-scroll behaviour (copied from Shadowfax ChatPanel)
  useEffect(() => {
    const currentLength = messages.length;
    const prevLength = prevMessagesLengthRef.current;

    // New message added
    if (currentLength > prevLength) {
      const lastMessage = messages[currentLength - 1];
      // Always scroll when user sends, or when assistant finished
      if (lastMessage?.sender === "user" || !isStreaming) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } else if (!isStreaming && prevLength === currentLength) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevMessagesLengthRef.current = currentLength;
  }, [messages, isStreaming]);

  return (
    <div className={`w-full bg-background flex flex-col ${className}`}>
      {" "}
      {/* Header */}
      <div className="px-4 py-2 border-b flex items-center justify-between h-10">
        <h2 className="font-semibold text-sm truncate">{title}</h2>
        {onResetChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetChat}
            disabled={isResetting || isStreaming}
            className="h-7 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {isResetting ? "Resetting..." : "Reset"}
          </Button>
        )}
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4 w-full bg-background">
        {messages
          .filter(
            (msg) =>
              !(
                msg.sender === "system" &&
                !msg.content &&
                !msg.function_name &&
                !msg.reasoning_summary
              ),
          )
          .map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Input area */}
      <ChatInput
        isStreaming={isStreaming}
        onSendMessage={onSendMessage}
        error={error}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
