import React, { useState } from "react";
import { Send, Paperclip, Sparkles, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  isStreaming: boolean;
  error?: string | null;
  onSendMessage: (message: string) => Promise<void> | void;
  placeholder?: string;
}

export function ChatInput({
  isStreaming,
  error,
  onSendMessage,
  placeholder = "Type your message…",
}: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState<string>("");

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
    <div className="border-t p-4">
      <div className="rounded-lg border">
        <Textarea
          className="flex-1 resize-none focus-visible:ring-0 border-0 shadow-none"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "Agent is thinking…" : placeholder}
          rows={3}
          disabled={isStreaming}
        />
        <div className="flex items-center justify-between p-2 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Sparkles className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isStreaming}
              className="px-3 h-8 bg-black hover:bg-gray-900 text-white rounded-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}
