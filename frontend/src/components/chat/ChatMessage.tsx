import React from "react";
import { User, BotMessageSquare } from "lucide-react";

import { Message } from "@/store/slices/chatSliceFactory";

import { MarkdownMessage } from "./MarkdownMessage";
import { ReasoningSummary } from "./ReasoningSummary";
import { getToolIcon, getToolLabel } from "./ToolUtils";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === "user";

  return (
    <div className="flex items-start space-x-4">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <BotMessageSquare className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap break-words overflow-hidden pt-1.5">
            {message.content}
          </div>
        ) : (
          <div className="space-y-2">
            <MarkdownMessage
              content={message.content}
              className="text-sm break-words overflow-hidden"
            />
            {message.function_name && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full">
                  {getToolIcon(message.function_name)}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {getToolLabel(message.function_name)}
                </span>
              </div>
            )}
            {message.reasoning_summary && (
              <ReasoningSummary
                summary={message.reasoning_summary}
                isStreaming={message.isStreaming}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
