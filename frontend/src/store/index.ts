import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

import appAgentSessionsReducer from "./slices/appAgentSessionsSlice";
import appChatReducer from "./slices/appChatSlice";
import appsReducer from "./slices/appsSlice";
import connectionsReducer from "./slices/connectionsSlice";
import notebookAgentSessionsReducer from "./slices/notebookAgentSessionsSlice";
import notebookChatReducer from "./slices/notebookChatSlice";
import notebooksReducer from "./slices/notebooksSlice";
import { RootState } from "./types";

export const store = configureStore({
  reducer: {
    apps: appsReducer,
    appAgentSessions: appAgentSessionsReducer,
    appChat: appChatReducer,
    connections: connectionsReducer,
    notebooks: notebooksReducer,
    notebookAgentSessions: notebookAgentSessionsReducer,
    notebookChat: notebookChatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Enable serializable check for catching non-serializable values
      serializableCheck: {
        // Ignore these action types if we add redux-persist later
        // ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
