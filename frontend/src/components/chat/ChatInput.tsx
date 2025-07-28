import { ArrowUp, BarChart3, Paperclip, Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  isStreaming: boolean;
  error?: string | null;
  onSendMessage: (message: string, model?: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
}

const MODEL_OPTIONS = [
  { value: "o4-mini", label: "o4-mini" },
  { value: "gpt-4.1", label: "gpt-4.1" },
  { value: "o3", label: "o3" },
];

export function ChatInput({
  isStreaming,
  error,
  onSendMessage,
  placeholder = "Type your message…",
  disabled = false,
}: ChatInputProps) {
  const [inputMessage, setInputMessage] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4.1");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming || disabled) return;
    const result = onSendMessage(inputMessage, selectedModel);
    if (result instanceof Promise) {
      await result;
    }
    setInputMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t p-1">
      <Textarea
        ref={textareaRef}
        className="flex-1 resize-none focus-visible:ring-0 border-0 shadow-none max-h-48"
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isStreaming ? "Agent is thinking…" : placeholder}
        rows={1}
        disabled={isStreaming || disabled}
      />
      <div className="flex items-center justify-between p-2 mt-1">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <BarChart3 className="w-4 h-4 mr-1" />
                <span className="text-xs">{selectedModel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {MODEL_OPTIONS.map((model) => (
                <DropdownMenuItem
                  key={model.value}
                  onClick={() => setSelectedModel(model.value)}
                  className="cursor-pointer"
                >
                  {model.label}
                  {selectedModel === model.value && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ✓
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
            disabled={!inputMessage.trim() || isStreaming || disabled}
            className="px-3 h-8 bg-black hover:bg-gray-900 text-white rounded-md"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
    </div>
  );
}
