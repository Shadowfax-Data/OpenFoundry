import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  AppAgentSessionFromAPI,
  NotebookAgentSessionFromAPI,
} from "@/types/api";

// Generic types for the factory function
export type ResourceType = "apps" | "notebooks";
export type SessionType<T extends ResourceType> = T extends "apps"
  ? AppAgentSessionFromAPI
  : NotebookAgentSessionFromAPI;

export type ResourceIdKey<T extends ResourceType> = T extends "apps"
  ? "appId"
  : "notebookId";

// Generic return types for thunks
export type FetchSessionsReturn<T extends ResourceType> = {
  [K in ResourceIdKey<T>]: string;
} & {
  sessions: SessionType<T>[];
};

export type CreateSessionReturn<T extends ResourceType> = {
  [K in ResourceIdKey<T>]: string;
} & {
  session: SessionType<T>;
};

export type SessionActionReturn<T extends ResourceType> = {
  [K in ResourceIdKey<T>]: string;
} & {
  session: SessionType<T>;
};

export type DeleteSessionReturn<T extends ResourceType> = {
  [K in ResourceIdKey<T>]: string;
} & {
  sessionId: string;
};

export type SaveWorkspaceReturn<T extends ResourceType> = {
  [K in ResourceIdKey<T>]: string;
} & {
  sessionId: string;
  message: string;
};

// Factory function that creates all agent session async thunks for a given resource type
export function createAgentSessionThunks<T extends ResourceType>(
  resourceType: T,
  sliceName: string,
) {
  const resourceIdKey = (
    resourceType === "apps" ? "appId" : "notebookId"
  ) as ResourceIdKey<T>;
  const resourceSingular = resourceType.slice(0, -1); // "app" or "notebook"

  // Fetch sessions
  const fetchSessions = createAsyncThunk(
    `${sliceName}/fetch${resourceSingular.charAt(0).toUpperCase() + resourceSingular.slice(1)}AgentSessions`,
    async (resourceId: string, { rejectWithValue }) => {
      try {
        const response = await fetch(
          `/api/${resourceType}/${resourceId}/sessions`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const sessions: SessionType<T>[] = await response.json();
        return {
          [resourceIdKey]: resourceId,
          sessions,
        } as FetchSessionsReturn<T>;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error
            ? error.message
            : `Failed to fetch ${resourceSingular} agent sessions`,
        );
      }
    },
  );

  // Create session
  const createSession = createAsyncThunk(
    `${sliceName}/create${resourceSingular.charAt(0).toUpperCase() + resourceSingular.slice(1)}AgentSession`,
    async (resourceId: string, { rejectWithValue }) => {
      try {
        const response = await fetch(
          `/api/${resourceType}/${resourceId}/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const session: SessionType<T> = await response.json();
        return {
          [resourceIdKey]: resourceId,
          session,
        } as CreateSessionReturn<T>;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error
            ? error.message
            : `Failed to create ${resourceSingular} agent session`,
        );
      }
    },
  );

  // Stop session
  const stopSession = createAsyncThunk(
    `${sliceName}/stop${resourceSingular.charAt(0).toUpperCase() + resourceSingular.slice(1)}AgentSession`,
    async (
      params: T extends "apps"
        ? { appId: string; sessionId: string }
        : { notebookId: string; sessionId: string },
      { rejectWithValue },
    ) => {
      try {
        const resourceId =
          resourceType === "apps"
            ? (params as { appId: string; sessionId: string }).appId
            : (params as { notebookId: string; sessionId: string }).notebookId;

        const response = await fetch(
          `/api/${resourceType}/${resourceId}/sessions/${params.sessionId}/stop`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const session: SessionType<T> = await response.json();
        return {
          [resourceIdKey]: resourceId,
          session,
        } as SessionActionReturn<T>;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error
            ? error.message
            : `Failed to stop ${resourceSingular} agent session`,
        );
      }
    },
  );

  // Resume session
  const resumeSession = createAsyncThunk(
    `${sliceName}/resume${resourceSingular.charAt(0).toUpperCase() + resourceSingular.slice(1)}AgentSession`,
    async (
      params: T extends "apps"
        ? { appId: string; sessionId: string }
        : { notebookId: string; sessionId: string },
      { rejectWithValue },
    ) => {
      try {
        const resourceId =
          resourceType === "apps"
            ? (params as { appId: string; sessionId: string }).appId
            : (params as { notebookId: string; sessionId: string }).notebookId;

        const response = await fetch(
          `/api/${resourceType}/${resourceId}/sessions/${params.sessionId}/resume`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const session: SessionType<T> = await response.json();
        return {
          [resourceIdKey]: resourceId,
          session,
        } as SessionActionReturn<T>;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error
            ? error.message
            : `Failed to resume ${resourceSingular} agent session`,
        );
      }
    },
  );

  // Delete session (only for apps)
  const deleteSession =
    resourceType === "apps"
      ? createAsyncThunk(
          `${sliceName}/delete${resourceSingular.charAt(0).toUpperCase() + resourceSingular.slice(1)}AgentSession`,
          async (
            params: { appId: string; sessionId: string },
            { rejectWithValue },
          ) => {
            try {
              const response = await fetch(
                `/api/${resourceType}/${params.appId}/sessions/${params.sessionId}`,
                {
                  method: "DELETE",
                },
              );

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              return {
                [resourceIdKey]: params.appId,
                sessionId: params.sessionId,
              } as DeleteSessionReturn<T>;
            } catch (error) {
              return rejectWithValue(
                error instanceof Error
                  ? error.message
                  : `Failed to delete ${resourceSingular} agent session`,
              );
            }
          },
        )
      : undefined;

  // Save workspace (only for notebooks)
  const saveWorkspace =
    resourceType === "notebooks"
      ? createAsyncThunk(
          `${sliceName}/save${resourceSingular.charAt(0).toUpperCase() + resourceSingular.slice(1)}Workspace`,
          async (
            params: { notebookId: string; sessionId: string },
            { rejectWithValue },
          ) => {
            try {
              const response = await fetch(
                `/api/${resourceType}/${params.notebookId}/sessions/${params.sessionId}/save`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                },
              );

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();
              return {
                [resourceIdKey]: params.notebookId,
                sessionId: params.sessionId,
                message: result.message,
              } as SaveWorkspaceReturn<T>;
            } catch (error) {
              return rejectWithValue(
                error instanceof Error
                  ? error.message
                  : `Failed to save ${resourceSingular} workspace`,
              );
            }
          },
        )
      : undefined;

  return {
    fetchSessions,
    createSession,
    stopSession,
    resumeSession,
    ...(deleteSession && { deleteSession }),
    ...(saveWorkspace && { saveWorkspace }),
  };
}
