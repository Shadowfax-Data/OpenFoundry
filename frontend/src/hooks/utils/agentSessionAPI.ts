// Utility functions for common agent session API operations

export type ResourceType = "apps" | "notebooks";

interface CreateAgentSessionParams {
  resourceType: ResourceType;
  resourceId: string;
}

interface SaveWorkspaceParams {
  resourceType: ResourceType;
  resourceId: string;
  sessionId: string;
}

interface FetchSessionDetailsParams {
  resourceType: ResourceType;
  resourceId: string;
  sessionId: string;
}

export interface SessionDetails {
  preview_url?: string;
  preview_token?: string;
}

/**
 * Creates a new agent session for the specified resource
 */
export const createAgentSession = async ({
  resourceType,
  resourceId,
}: CreateAgentSessionParams) => {
  const response = await fetch(`/api/${resourceType}/${resourceId}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Saves the workspace for a session
 */
export const saveWorkspace = async ({
  resourceType,
  resourceId,
  sessionId,
}: SaveWorkspaceParams) => {
  const response = await fetch(
    `/api/${resourceType}/${resourceId}/sessions/${sessionId}/save`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return await response.json();
};

/**
 * Fetches session details including preview URLs and tokens
 */
export const fetchSessionDetails = async ({
  resourceType,
  resourceId,
  sessionId,
}: FetchSessionDetailsParams): Promise<SessionDetails | null> => {
  try {
    const response = await fetch(
      `/api/${resourceType}/${resourceId}/sessions/${sessionId}`,
    );

    if (response.ok) {
      return await response.json();
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch ${resourceType} session details:`, error);
    return null;
  }
};
