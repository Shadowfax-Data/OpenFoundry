import { createSlice, PayloadAction, Slice } from "@reduxjs/toolkit";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "system";
  isStreaming: boolean;
  reasoning_summary?: string;
  function_name?: string; // For tool call thought messages
}

export interface CurrentWriteFileInfo {
  fileName: string;
  content: string;
  absolute_file_path: string;
}

// Simplified active tool call state
export interface ActiveToolCall {
  function_name: string;
  raw_arguments?: string;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  activeToolCall: ActiveToolCall | null;
}

// Simplified write_file extraction - only called when needed
const extractWriteFileInfo = (args: string): CurrentWriteFileInfo | null => {
  try {
    // Try JSON parse first
    const parsed = JSON.parse(args);
    const absolute_file_path = parsed.absolute_file_path;
    const content = parsed.content || "";
    const fileName = absolute_file_path?.split("/").pop() || "";

    if (fileName && absolute_file_path && typeof content === "string") {
      return { fileName, content, absolute_file_path };
    }
  } catch {
    // Fallback to regex for partial JSON
    const pathMatch = args.match(/"absolute_file_path":"([^"]+)"/);
    const contentMatch = args.match(/"content":"((?:\\"|[^"])*)"/);

    if (pathMatch?.[1] && contentMatch?.[1]) {
      const absolute_file_path = pathMatch[1];
      const content = contentMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\\\/g, "\\");
      const fileName = absolute_file_path.split("/").pop() || "";

      return { fileName, content, absolute_file_path };
    }
  }
  return null;
};

export function createChatSlice(name: string): Slice<ChatState> {
  const initialState: ChatState = {
    messages: [],
    isStreaming: false,
    isLoading: false,
    error: null,
    activeToolCall: null,
  };

  return createSlice({
    name,
    initialState,
    reducers: {
      addMessage: (state, action: PayloadAction<Message>) => {
        state.messages.push(action.payload);
      },
      removeMessage: (state, action: PayloadAction<string>) => {
        const index = state.messages.findIndex((m) => m.id === action.payload);
        if (index !== -1) {
          state.messages.splice(index, 1);
        }
      },
      updateLastMessage: (state, action: PayloadAction<string>) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage) {
          lastMessage.content += action.payload;
        }
      },
      updateMessageContentById: (
        state,
        action: PayloadAction<{ id: string; content: string }>,
      ) => {
        const message = state.messages.find((m) => m.id === action.payload.id);
        if (message) {
          message.content = action.payload.content;
        }
      },
      updateLastMessageReasoningSummary: (
        state,
        action: PayloadAction<string>,
      ) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage) {
          if (!lastMessage.reasoning_summary)
            lastMessage.reasoning_summary = "";
          lastMessage.reasoning_summary += action.payload;
        }
      },
      updateLastMessageStreaming: (state, action: PayloadAction<boolean>) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage) {
          lastMessage.isStreaming = action.payload;
        }
      },
      updateMessageStreamingById: (
        state,
        action: PayloadAction<{ id: string; isStreaming: boolean }>,
      ) => {
        const message = state.messages.find((m) => m.id === action.payload.id);
        if (message) {
          message.isStreaming = action.payload.isStreaming;
        }
      },
      setStreaming: (state, action: PayloadAction<boolean>) => {
        state.isStreaming = action.payload;
      },
      setLoading: (state, action: PayloadAction<boolean>) => {
        state.isLoading = action.payload;
      },
      setError: (state, action: PayloadAction<string | null>) => {
        state.error = action.payload;
      },
      clearMessages: (state) => {
        state.messages = [];
      },
      // Simplified tool call management
      startToolCall: (
        state,
        action: PayloadAction<{ function_name: string }>,
      ) => {
        state.activeToolCall = {
          function_name: action.payload.function_name,
          raw_arguments: "",
        };
      },
      updateToolCallArguments: (state, action: PayloadAction<string>) => {
        if (state.activeToolCall) {
          state.activeToolCall.raw_arguments =
            (state.activeToolCall.raw_arguments || "") + action.payload;
        }
      },
      completeToolCall: (state) => {
        state.activeToolCall = null;
      },
    },
  });
}

// Simplified selector - only extract when we need it
export const createCurrentWriteFileInfoSelector =
  (sliceName: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state: any): CurrentWriteFileInfo | null => {
    const chatState = state[sliceName];
    if (
      chatState?.activeToolCall?.function_name === "write_file" &&
      chatState.activeToolCall.raw_arguments
    ) {
      return extractWriteFileInfo(chatState.activeToolCall.raw_arguments);
    }
    return null;
  };
