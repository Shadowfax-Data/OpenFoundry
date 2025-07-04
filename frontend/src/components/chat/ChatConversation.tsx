import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Message } from "@/store/slices/chatSliceFactory";

import { ChatMessage } from "./ChatMessage";

interface ChatConversationProps {
  title?: string;
  messages: Message[];
  isStreaming: boolean;
  error?: string | null;
  onSendMessage: (message: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
}

export function ChatConversation({
  title = "Conversation",
  messages,
  isStreaming,
  error,
  onSendMessage,
  placeholder = "Type your message…",
  className = "",
}: ChatConversationProps) {
  const [inputMessage, setInputMessage] = useState<string>("");
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

  // Clear input while streaming so user sees the placeholder
  useEffect(() => {
    if (isStreaming) setInputMessage("");
  }, [isStreaming]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;
    const result = onSendMessage(inputMessage);
    if (result instanceof Promise) {
      await result;
    }
    setInputMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={`w-full bg-background rounded-lg border flex flex-col ${className}`}
    >
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
      <div className="border-t p-4 bg-background">
        <div className="flex items-end space-x-2">
          <Textarea
            className="flex-1 resize-none min-h-[40px] focus-visible:ring-0 border-input"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Agent is thinking…" : placeholder}
            rows={1}
            disabled={isStreaming}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isStreaming}
            className="px-3 h-10 bg-black hover:bg-gray-900 text-white rounded-md"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
      </div>
    </div>
  );
}
