import {
  ChatState,
  createChatSlice,
  createCurrentWriteFileInfoSelector,
  CurrentWriteFileInfo,
  Message,
} from "./chatSliceFactory";

export const notebookChatSlice = createChatSlice("notebookChat");

export const selectCurrentNotebookWriteFileInfo =
  createCurrentWriteFileInfoSelector("notebookChat");

// Selector to detect notebook tool activity
export const selectNotebookToolActivity = (state: {
  notebookChat: ChatState;
}) => {
  const activeToolCall = state.notebookChat.activeToolCall;
  if (!activeToolCall) return null;

  const isNotebookTool = [
    "execute_cell",
    "get_notebook",
    "run_all_cells",
    "stop_cell",
    "delete_cell",
  ].includes(activeToolCall.function_name);

  if (isNotebookTool) {
    return {
      toolName: activeToolCall.function_name,
      arguments: activeToolCall.raw_arguments,
      isComplete: false, // We'll update this when tool completes
    };
  }

  return null;
};

// Helper to extract cell_id from tool arguments
export const extractCellIdFromArgs = (args: string): string | null => {
  try {
    const parsed = JSON.parse(args);
    return parsed.cell_id || null;
  } catch {
    // Fallback to regex for partial JSON
    const match = args.match(/"cell_id"\s*:\s*"([^"]+)"/);
    return match?.[1] || null;
  }
};

export const {
  addMessage,
  removeMessage,
  updateLastMessage,
  updateLastMessageReasoningSummary,
  updateLastMessageStreaming,
  updateMessageContentById,
  updateMessageStreamingById,
  setStreaming,
  setLoading,
  setError,
  clearMessages,
  startToolCall,
  updateToolCallArguments,
  completeToolCall,
} = notebookChatSlice.actions;

export type { CurrentWriteFileInfo, Message, ChatState as NotebookChatState };

export default notebookChatSlice.reducer;
