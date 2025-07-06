import { useState, useEffect, useCallback } from "react";
import { filesApi } from "@/services/filesApi";
import { DirectoryEntry, ReadFileResponse } from "@/types/files";

interface UseFilesProps {
  appId: string;
  sessionId: string;
  initialPath?: string;
}

export const useFiles = ({
  appId,
  sessionId,
  initialPath = "/workspace",
}: UseFilesProps) => {
  const [files, setFiles] = useState<DirectoryEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(
    async (path?: string) => {
      const targetPath = path || currentPath;
      setLoading(true);
      setError(null);

      try {
        const response = await filesApi.listFiles(appId, sessionId, targetPath);
        setFiles(response.entries);
        setCurrentPath(response.path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
        console.error("Error loading files:", err);
      } finally {
        setLoading(false);
      }
    },
    [appId, sessionId, currentPath],
  );

  const readFile = useCallback(
    async (path: string): Promise<ReadFileResponse | null> => {
      try {
        setError(null);
        return await filesApi.readFile(appId, sessionId, path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to read file");
        console.error("Error reading file:", err);
        return null;
      }
    },
    [appId, sessionId],
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
    loadFiles,
    readFile,
    refreshFiles,
  };
};
