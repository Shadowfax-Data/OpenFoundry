import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { Message } from "@/store/slices/chatSliceFactory";

interface ChatConversationProps {
  title?: string;
  messages: Message[];
  isStreaming: boolean;
  error?: string | null;
  onSendMessage: (message: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
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
      <div className="px-4 py-2 border-b flex items-center h-10">
        <h2 className="font-semibold text-sm truncate">{title}</h2>
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
