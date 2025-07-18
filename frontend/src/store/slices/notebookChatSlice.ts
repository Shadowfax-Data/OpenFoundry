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

export type { CurrentWriteFileInfo, Message,ChatState as NotebookChatState };

export default notebookChatSlice.reducer;
