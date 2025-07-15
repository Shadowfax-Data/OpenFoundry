import {
  ActionCreatorWithoutPayload,
  ActionCreatorWithPayload,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import {
  ChatState,
  CurrentWriteFileInfo,
  Message,
} from "@/store/slices/chatSliceFactory";
import { RootState } from "@/store/types";

import { useChatHistory } from "./useChatHistory";

interface ChatActions {
  addMessage: ActionCreatorWithPayload<Message>;
  clearMessages: ActionCreatorWithoutPayload;
  setLoading: ActionCreatorWithPayload<boolean>;
  setError: ActionCreatorWithPayload<string | null>;
  setStreaming: ActionCreatorWithPayload<boolean>;
  updateLastMessage: ActionCreatorWithPayload<string>;
  updateLastMessageStreaming: ActionCreatorWithPayload<boolean>;
  startToolCall: ActionCreatorWithPayload<{ function_name: string }>;
  updateToolCallArguments: ActionCreatorWithPayload<string>;
  completeToolCall: ActionCreatorWithoutPayload;
  updateLastMessageReasoningSummary: ActionCreatorWithPayload<string>;
  updateMessageContentById: ActionCreatorWithPayload<{
    id: string;
    content: string;
  }>;
  updateMessageStreamingById: ActionCreatorWithPayload<{
    id: string;
    isStreaming: boolean;
  }>;
  removeMessage: ActionCreatorWithPayload<string>;
}

interface UseBaseChatProps {
  resourceId: string;
  sessionId: string;
  baseEndpoint: string;
  welcomeMessage?: string;
  actions: ChatActions;
  chatSelector: (state: RootState) => ChatState;
  selectCurrentWriteFileInfo: (state: RootState) => CurrentWriteFileInfo | null;
  initialPrompt?: string;
}

export const useBaseChat = ({
  resourceId,
  sessionId,
  baseEndpoint,
  welcomeMessage = "Welcome to the AI Assistant! What would you like to do today?",
  actions,
  chatSelector,
  selectCurrentWriteFileInfo,
  initialPrompt,
}: UseBaseChatProps) => {
  const dispatch = useDispatch();
  const { messages, isStreaming, error } = useSelector(chatSelector);
  const currentWriteFileInfo = useSelector(selectCurrentWriteFileInfo);

  // Load chat history when component mounts
  useChatHistory({
    resourceId,
    sessionId,
    baseEndpoint,
    welcomeMessage,
    actions,
    initialPrompt,
  });

  const sendMessage = async (inputMessage: string, model?: string) => {
    if (!inputMessage.trim()) return;

    let currentToolCall: { name: string; arguments: string } | null = null;
    let thoughtMessageId: string | null = null;
    let lastPlaceholderId: string | null = null;
    let currentReasoningSummary = "";

    const userMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user" as const,
      isStreaming: false,
      reasoning_summary: "",
    };

    dispatch(actions.addMessage(userMessage));

    try {
      dispatch(actions.setStreaming(true));
      const response = await fetch(
        `${baseEndpoint}/${resourceId}/sessions/${sessionId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: inputMessage,
            model: model,
          }),
        },
      );

      if (!response.ok || !response.body)
        throw new Error(`HTTP error: ${response.status}`);

      const systemMessage = {
        id: (Date.now() + 1).toString(),
        content: "",
        sender: "system" as const,
        isStreaming: true,
        reasoning_summary: "",
      };

      dispatch(actions.addMessage(systemMessage));

      const reader = response.body.getReader();
      if (!reader) throw new Error("No reader available");

      const extractThought = (args: string): string | null => {
        try {
          const parsed = JSON.parse(args);
          if (typeof parsed.thought === "string") {
            return parsed.thought;
          }
        } catch {
          // Fallback to regex for partial JSON
        }
        const match = args.match(/"thought"\s*:\s*"((?:\\"|[^"])*)/);
        if (match?.[1]) {
          try {
            return JSON.parse(`"${match[1]}"`);
          } catch {
            return match[1];
          }
        }
        return null;
      };

      const processEvent = (event: string) => {
        try {
          const parsedEvent = JSON.parse(event);

          switch (parsedEvent.event_type) {
            case "heartbeat":
              break;
            case "response.output_text.delta":
              for (const char of parsedEvent.delta) {
                dispatch(actions.updateLastMessage(char));
              }
              break;
            case "response.reasoning_summary_text.delta":
              // Update the placeholder's reasoning summary and store locally
              currentReasoningSummary += parsedEvent.delta;
              for (const char of parsedEvent.delta) {
                dispatch(actions.updateLastMessageReasoningSummary(char));
              }
              break;
            case "response.output_item.added":
              if (parsedEvent.item_type === "function_call") {
                // If we have a reasoning placeholder, remove it and transfer the reasoning summary
                if (lastPlaceholderId) {
                  dispatch(actions.removeMessage(lastPlaceholderId));
                }

                currentToolCall = {
                  name: parsedEvent.function_name,
                  arguments: "",
                };
                thoughtMessageId = Date.now().toString() + "_thought";
                dispatch(
                  actions.addMessage({
                    id: thoughtMessageId,
                    content: "",
                    sender: "system",
                    isStreaming: true,
                    function_name: parsedEvent.function_name,
                    reasoning_summary: currentReasoningSummary,
                  }),
                );
                lastPlaceholderId = null;
                currentReasoningSummary = "";
                dispatch(
                  actions.startToolCall({
                    function_name: parsedEvent.function_name,
                  }),
                );
              } else if (parsedEvent.item_type === "reasoning") {
                // Only create a new reasoning placeholder if one doesn't already exist
                if (!lastPlaceholderId) {
                  lastPlaceholderId =
                    Date.now().toString() + "_reasoning_placeholder";
                  dispatch(
                    actions.addMessage({
                      id: lastPlaceholderId,
                      content: "AI is thinking...",
                      sender: "system",
                      isStreaming: true,
                      reasoning_summary: "",
                    }),
                  );
                }
              } else if (parsedEvent.item_type === "message") {
                const newMessageId = Date.now().toString();

                // If we have a reasoning placeholder, remove it and transfer the reasoning summary
                if (lastPlaceholderId) {
                  dispatch(actions.removeMessage(lastPlaceholderId));
                }

                dispatch(
                  actions.addMessage({
                    id: newMessageId,
                    content: "",
                    sender: "system",
                    isStreaming: true,
                    reasoning_summary: currentReasoningSummary,
                  }),
                );
                lastPlaceholderId = null;
                currentReasoningSummary = "";
              }
              break;
            case "response.function_call_arguments.delta":
              if (currentToolCall && thoughtMessageId) {
                currentToolCall.arguments += parsedEvent.delta;
                const partialThought = extractThought(
                  currentToolCall.arguments,
                );
                if (partialThought) {
                  dispatch(
                    actions.updateMessageContentById({
                      id: thoughtMessageId,
                      content: partialThought,
                    }),
                  );
                }
              }
              dispatch(actions.updateToolCallArguments(parsedEvent.delta));
              break;
            case "response.function_call_arguments.done":
              if (currentToolCall && thoughtMessageId) {
                const finalThought = extractThought(currentToolCall.arguments);
                if (finalThought) {
                  dispatch(
                    actions.updateMessageContentById({
                      id: thoughtMessageId,
                      content: finalThought,
                    }),
                  );
                }
                dispatch(
                  actions.updateMessageStreamingById({
                    id: thoughtMessageId,
                    isStreaming: false,
                  }),
                );
              }
              currentToolCall = null;
              thoughtMessageId = null;
              dispatch(actions.completeToolCall(undefined));
              break;
            case "error":
              // Clean up any remaining reasoning placeholder
              if (lastPlaceholderId) {
                dispatch(actions.removeMessage(lastPlaceholderId));
                lastPlaceholderId = null;
                currentReasoningSummary = "";
              }

              dispatch(actions.setError(parsedEvent.error));
              dispatch(actions.setStreaming(false));
              dispatch(actions.updateLastMessageStreaming(false));
              return true;
          }
        } catch (e) {
          console.error("Failed to parse event:", event, e);
        }
        return false;
      };

      const decoder = new TextDecoder();
      const delimiter = "\n\n";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lastDoubleNewlineIndex = buffer.lastIndexOf(delimiter);
        if (lastDoubleNewlineIndex !== -1) {
          const completeEventsBuffer = buffer.substring(
            0,
            lastDoubleNewlineIndex + delimiter.length,
          );
          buffer = buffer.substring(lastDoubleNewlineIndex + delimiter.length);
          const events = completeEventsBuffer.split(delimiter).filter(Boolean);
          let shouldBreak = false;
          for (const event of events) {
            if (processEvent(event)) {
              shouldBreak = true;
              break;
            }
          }
          if (shouldBreak) break;
        }
      }

      // Clean up any remaining reasoning placeholder
      if (lastPlaceholderId) {
        dispatch(actions.removeMessage(lastPlaceholderId));
        lastPlaceholderId = null;
        currentReasoningSummary = "";
      }

      dispatch(actions.updateLastMessageStreaming(false));
      dispatch(actions.completeToolCall(undefined));
    } catch (err) {
      // Clean up any remaining reasoning placeholder
      if (lastPlaceholderId) {
        dispatch(actions.removeMessage(lastPlaceholderId));
        lastPlaceholderId = null;
        currentReasoningSummary = "";
      }

      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      dispatch(actions.setError(errorMessage));
    } finally {
      dispatch(actions.setStreaming(false));
    }
  };

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    currentWriteFileInfo,
  };
};
