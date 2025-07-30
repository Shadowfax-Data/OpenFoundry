import { ArrowUp, BarChart3, ImageIcon, Paperclip, X } from "lucide-react";
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
  onSendMessage: (
    message: string,
    model?: string,
    images?: string[],
  ) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
}

interface AttachedImage {
  id: string;
  base64: string;
  name: string;
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
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming || disabled) return;
    const images =
      attachedImages.length > 0
        ? attachedImages.map((img) => img.base64)
        : undefined;
    const result = onSendMessage(inputMessage, selectedModel, images);
    if (result instanceof Promise) {
      await result;
    }
    setInputMessage("");
    setAttachedImages([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          const base64Data = base64.split(",")[1]; // Remove data:image/...;base64, prefix
          const newImage: AttachedImage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            base64: base64Data,
            name: file.name,
          };
          setAttachedImages((prev) => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (imageId: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== imageId));
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
      {attachedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border-t">
          {attachedImages.map((image) => (
            <div
              key={image.id}
              className="relative group bg-gray-100 rounded-lg p-2 flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-700 max-w-20 truncate">
                {image.name}
              </span>
              <button
                onClick={() => removeImage(image.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
              >
                <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
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
