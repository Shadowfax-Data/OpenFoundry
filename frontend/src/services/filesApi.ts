import {
  ListFilesResponse,
  ReadFileResponse,
  WriteFileRequest,
  WriteFileResponse,
} from "@/types/files";

const API_BASE = "/api/apps";

export const filesApi = {
  async listFiles(
    appId: string,
    sessionId: string,
    path?: string,
    includeHidden: boolean = false,
  ): Promise<ListFilesResponse> {
    const params = new URLSearchParams();
    if (path) {
      params.append("path", path);
    }
    params.append("include_hidden", includeHidden.toString());

    const response = await fetch(
      `${API_BASE}/${appId}/sessions/${sessionId}/files?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    return response.json();
  },

  async readFile(
    appId: string,
    sessionId: string,
    path: string,
    encoding: string = "utf-8",
  ): Promise<ReadFileResponse> {
    const params = new URLSearchParams();
    params.append("path", path);
    params.append("encoding", encoding);

    const response = await fetch(
      `${API_BASE}/${appId}/sessions/${sessionId}/files/read?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }

    return response.json();
  },

  async writeFile(
    appId: string,
    sessionId: string,
    writeRequest: WriteFileRequest,
  ): Promise<WriteFileResponse> {
    const response = await fetch(
      `${API_BASE}/${appId}/sessions/${sessionId}/files/write`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(writeRequest),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }

    return response.json();
  },
};
