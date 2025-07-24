import { useCallback, useEffect, useRef, useState } from "react";

import { NotebookCell, NotebookData } from "./types";

interface UseNotebookDataProps {
  notebookId: string;
  sessionId: string;
  autoLoad?: boolean;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export const useNotebookData = ({
  notebookId,
  sessionId,
  autoLoad = true,
  enablePolling = false,
  pollingInterval = 3000,
}: UseNotebookDataProps) => {
  const [notebookData, setNotebookData] = useState<NotebookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const baseUrl = `/api/notebooks/${notebookId}/sessions/${sessionId}`;

  // Get notebook data
  const getNotebook = useCallback(async (): Promise<NotebookData | null> => {
    try {
      setError(null);
      const response = await fetch(`${baseUrl}/notebook`);

      if (!response.ok) {
        throw new Error(`Failed to get notebook: ${response.statusText}`);
      }

      const data = await response.json();

      // Ensure all cells have frontend_cell_ids
      if (data && data.cells) {
        data.cells = data.cells.map((cell: NotebookCell) => ({
          ...cell,
          id: cell.id ?? crypto.randomUUID(),
        }));
      }

      setNotebookData(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to get notebook";
      setError(errorMessage);
      console.error("Error getting notebook:", err);
      return null;
    }
  }, [baseUrl]);

  // Start polling
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      getNotebook();
    }, pollingInterval);
  }, [getNotebook, pollingInterval]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Load initial data - only when autoLoad is true
  useEffect(() => {
    if (!autoLoad) return;

    const loadInitialData = async () => {
      setLoading(true);
      await getNotebook();
      setLoading(false);
    };

    loadInitialData();
  }, [getNotebook, autoLoad]);

  // Handle polling
  useEffect(() => {
    if (enablePolling) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enablePolling, startPolling, stopPolling]);

  return {
    notebookData,
    setNotebookData,
    loading,
    error,
    setError,
    getNotebook,
    baseUrl,
    startPolling,
    stopPolling,
  };
};
