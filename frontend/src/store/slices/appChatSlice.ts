import {
  ChatState,
  createChatSlice,
  createCurrentWriteFileInfoSelector,
  CurrentWriteFileInfo,
  Message,
} from "./chatSliceFactory";

export const appChatSlice = createChatSlice("appChat");

export const selectCurrentAppWriteFileInfo =
  createCurrentWriteFileInfoSelector("appChat");

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
} = appChatSlice.actions;

export type { ChatState as AppChatState, CurrentWriteFileInfo, Message };

export default appChatSlice.reducer;
