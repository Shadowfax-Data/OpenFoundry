import { useState, useEffect, useCallback } from "react";
import {
  DirectoryEntry,
  ReadFileResponse,
  ListFilesResponse,
  WriteFileRequest,
  WriteFileResponse,
  UploadFileResponse,
} from "@/types/files";

const API_BASE = "/api/apps";

interface UseAgentSessionFilesProps {
  appId: string;
  sessionId: string;
  initialPath?: string;
}

export const useAgentSessionFiles = ({
  appId,
  sessionId,
  initialPath = "/workspace",
}: UseAgentSessionFilesProps) => {
  const [files, setFiles] = useState<DirectoryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFolders, setLoadedFolders] = useState<
    Map<string, DirectoryEntry[]>
  >(new Map());
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  // Internal API helper functions
  const listFiles = useCallback(
    async (
      path?: string,
      includeHidden: boolean = false,
    ): Promise<ListFilesResponse> => {
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
    [appId, sessionId],
  );

  const readFile = useCallback(
    async (
      path: string,
      encoding: string = "utf-8",
    ): Promise<ReadFileResponse> => {
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
    [appId, sessionId],
  );

  const writeFile = useCallback(
    async (writeRequest: WriteFileRequest): Promise<WriteFileResponse> => {
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
    [appId, sessionId],
  );

  const uploadFile = useCallback(
    async (file: File, path: string): Promise<UploadFileResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams();
      params.append("path", path);

      const response = await fetch(
        `${API_BASE}/${appId}/sessions/${sessionId}/files/upload?${params}`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to upload file: ${response.statusText} - ${
            errorData.detail || "Unknown error"
          }`,
        );
      }

      return response.json();
    },
    [appId, sessionId],
  );

  const loadFiles = useCallback(
    async (path?: string) => {
      const targetPath = path || currentPath;
      setLoading(true);
      setError(null);

      try {
        const response = await listFiles(targetPath);
        setFiles(response.entries);
        setCurrentPath(response.path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
        console.error("Error loading files:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentPath, listFiles],
  );

  const loadFolderContents = useCallback(
    async (folderPath: string): Promise<void> => {
      if (loadedFolders.has(folderPath) || loadingFolders.has(folderPath)) {
        return; // Already loaded or loading
      }

      setLoadingFolders((prev) => new Set(prev).add(folderPath));

      try {
        const response = await listFiles(folderPath);
        setLoadedFolders((prev) =>
          new Map(prev).set(folderPath, response.entries),
        );
      } catch (error) {
        console.error(
          `Failed to load folder contents for ${folderPath}:`,
          error,
        );
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load folder contents",
        );
      } finally {
        setLoadingFolders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(folderPath);
          return newSet;
        });
      }
    },
    [loadedFolders, loadingFolders, listFiles],
  );

  const refreshFolderContents = useCallback(
    async (folderPath: string): Promise<void> => {
      // Always refresh - bypass cache check
      setLoadingFolders((prev) => new Set(prev).add(folderPath));

      try {
        const response = await listFiles(folderPath);
        setLoadedFolders((prev) =>
          new Map(prev).set(folderPath, response.entries),
        );
      } catch (error) {
        console.error(
          `Failed to refresh folder contents for ${folderPath}:`,
          error,
        );
        setError(
          error instanceof Error
            ? error.message
            : "Failed to refresh folder contents",
        );
      } finally {
        setLoadingFolders((prev) => {
          const newSet = new Set(prev);
          newSet.delete(folderPath);
          return newSet;
        });
      }
    },
    [listFiles],
  );

  const readFileHandler = useCallback(
    async (path: string): Promise<ReadFileResponse | null> => {
      try {
        setError(null);
        return await readFile(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
        console.error("Error reading file:", err);
        return null;
      }
    },
    [readFile],
  );

  const refreshFiles = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  // Load files initially
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return {
    files,
    currentPath,
    loading,
    error,
    loadedFolders,
    loadingFolders,
    loadFiles,
    loadFolderContents,
    refreshFolderContents,
    readFile: readFileHandler,
    writeFile,
    uploadFile,
    refreshFiles,
  };
};
