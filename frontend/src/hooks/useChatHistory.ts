import {
  ActionCreatorWithoutPayload,
  ActionCreatorWithPayload,
} from "@reduxjs/toolkit";
import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";

import { Message } from "@/store/slices/chatSliceFactory";

interface ChatMessage {
  id?: string;
  content: string;
  role: "user" | "assistant";
}

interface ChatActions {
  addMessage: ActionCreatorWithPayload<Message>;
  clearMessages: ActionCreatorWithoutPayload;
  setLoading: ActionCreatorWithPayload<boolean>;
  setError: ActionCreatorWithPayload<string | null>;
}

interface UseChatHistoryProps {
  resourceId: string;
  sessionId: string;
  baseEndpoint: string;
  welcomeMessage: string;
  actions: ChatActions;
  initialPrompt?: string;
}

export const useChatHistory = ({
  resourceId,
  sessionId,
  baseEndpoint,
  welcomeMessage,
  actions,
  initialPrompt,
}: UseChatHistoryProps) => {
  const dispatch = useDispatch();

  const fetchChatHistory = useCallback(
    async (signal: AbortSignal) => {
      try {
        dispatch(actions.clearMessages());
        dispatch(actions.setLoading(true));

        const response = await fetch(
          `${baseEndpoint}/${resourceId}/sessions/${sessionId}/messages`,
          { signal },
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch messages: ${response.status}`);
        }
        if (signal.aborted) return;

        const data = await response.json();

        // Add welcome message if it exists
        if (welcomeMessage) {
          dispatch(
            actions.addMessage({
              id: Date.now().toString(),
              content: welcomeMessage,
              sender: "system",
              isStreaming: false,
            }),
          );
        }

        // Add initial prompt as user message if it exists and there are no existing messages
        if (initialPrompt && data.length === 0) {
          dispatch(
            actions.addMessage({
              id: (Date.now() + 1).toString(),
              content: initialPrompt,
              sender: "user",
              isStreaming: false,
            }),
          );
        }

        data.forEach((msg: ChatMessage) => {
          dispatch(
            actions.addMessage({
              id: msg.id || Date.now().toString(),
              content: msg.content,
              sender: msg.role === "user" ? "user" : "system",
              isStreaming: false,
            }),
          );
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch chat history";
        dispatch(actions.setError(errorMessage));
        console.error("Failed to load chat history:", errorMessage);
      } finally {
        if (!signal.aborted) {
          dispatch(actions.setLoading(false));
        }
      }
    },
    [
      resourceId,
      sessionId,
      dispatch,
      baseEndpoint,
      welcomeMessage,
      actions,
      initialPrompt,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchChatHistory(controller.signal);
    return () => {
      controller.abort();
    };
  }, [sessionId, fetchChatHistory]);
};
