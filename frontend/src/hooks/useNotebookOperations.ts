import { useCallback, useEffect, useState } from "react";

interface NotebookCell {
  id: string;
  cell_type: "code" | "markdown";
  source: string[];
  outputs?: any[];
  execution_count?: number | null;
}

// Type for UI components that can handle both string and string[] sources
interface NotebookCellInput {
  id: string;
  cell_type: "code" | "markdown";
  source: string[] | string;
  outputs?: any[];
  execution_count?: number | null;
}

interface NotebookData {
  cells: NotebookCell[];
  metadata: any;
  nbformat: number;
  nbformat_minor: number;
}

interface KernelStatus {
  is_ready: boolean;
  is_starting: boolean;
  kernel_id: string | null;
  sandbox_healthy: boolean;
  overall_ready: boolean;
}

interface ExecuteCodeRequest {
  code: string;
  cell_id: string;
}

interface ExecuteCodeResponse {
  cell_id: string;
  execution_count: number;
  outputs: any[];
  status: "completed" | "error";
  error_message?: string;
}

interface UseNotebookOperationsProps {
  notebookId: string;
  sessionId: string;
  autoLoad?: boolean; // Add this prop to control when to start loading
}

export const useNotebookOperations = ({
  notebookId,
  sessionId,
  autoLoad = true, // Default to true for backward compatibility
}: UseNotebookOperationsProps) => {
  const [notebookData, setNotebookData] = useState<NotebookData | null>(null);
  const [kernelStatus, setKernelStatus] = useState<KernelStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());

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

      console.log("data from getNotebook", data);

      // Ensure all cells have frontend_cell_ids
      if (data && data.cells) {
        data.cells = data.cells.map((cell: any) => ({
          ...cell,
          id: cell.id || `backend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
      }

      setNotebookData(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get notebook";
      setError(errorMessage);
      console.error("Error getting notebook:", err);
      return null;
    }
  }, [baseUrl]);

  // Execute code in a cell
  const executeCode = useCallback(async (
    request: ExecuteCodeRequest
  ): Promise<ExecuteCodeResponse | null> => {
    try {
      setError(null);
      const response = await fetch(`${baseUrl}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute code: ${response.statusText}`);
      }

      const result = await response.json();
      // Always refresh notebook data after execution to get updated cell outputs
      await getNotebook();

      console.log("result from executeCode", result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute code";
      setError(errorMessage);
      console.error("Error executing code:", err);
      return null;
    }
  }, [baseUrl, getNotebook]);

  // Get kernel status
  const getKernelStatus = useCallback(async (): Promise<KernelStatus | null> => {
    try {
      setError(null);
      const response = await fetch(`${baseUrl}/status`);

      if (!response.ok) {
        throw new Error(`Failed to get kernel status: ${response.statusText}`);
      }

      const status = await response.json();
      setKernelStatus(status);
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get kernel status";
      setError(errorMessage);
      console.error("Error getting kernel status:", err);
      return null;
    }
  }, [baseUrl]);

  // Restart kernel
  const restartKernel = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch(`${baseUrl}/restart`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to restart kernel: ${response.statusText}`);
      }

      // Refresh kernel status and notebook data after restart
      await Promise.all([getKernelStatus(), getNotebook()]);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to restart kernel";
      setError(errorMessage);
      console.error("Error restarting kernel:", err);
      return false;
    }
  }, [baseUrl, getKernelStatus, getNotebook]);

  // Rerun all cells
  const rerunNotebook = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`${baseUrl}/rerun`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to rerun notebook: ${response.statusText}`);
      }

      // Refresh notebook data after rerun
      await getNotebook();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to rerun notebook";
      setError(errorMessage);
      console.error("Error rerunning notebook:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [baseUrl, getNotebook]);

  // Cell management functions
  const addCell = useCallback((index: number, cellType: "code" | "markdown" = "code") => {
    if (!notebookData) return;

    const newCell: NotebookCell = {
      id: `backend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique backend ID
      cell_type: cellType,
      source: [],
      outputs: [],
      execution_count: null,
    };

    const newCells = [...notebookData.cells];
    newCells.splice(index, 0, newCell);

    setNotebookData({
      ...notebookData,
      cells: newCells,
    });
  }, [notebookData]);

  const updateCell = useCallback((index: number, updatedCell: NotebookCellInput) => {
    if (!notebookData) return;

    // Normalize the source to always be a string array
    const normalizedCell: NotebookCell = {
      ...updatedCell,
      source: Array.isArray(updatedCell.source)
        ? updatedCell.source
        : [updatedCell.source]
    };

    const newCells = [...notebookData.cells];
    newCells[index] = normalizedCell;

    setNotebookData({
      ...notebookData,
      cells: newCells,
    });
  }, [notebookData]);

  const deleteCell = useCallback((index: number) => {
    if (!notebookData) return;

    const newCells = [...notebookData.cells];
    newCells.splice(index, 1);

    setNotebookData({
      ...notebookData,
      cells: newCells,
    });
  }, [notebookData]);

  const executeCellWithStatus = useCallback(async (cellId: string, code: string) => {
    setExecutingCells(prev => new Set(prev).add(cellId));

    try {
      const executeRequest: ExecuteCodeRequest = {
        code,
        cell_id: cellId,
      };

      const result = await executeCode(executeRequest);
      console.log("result from executeCellWithStatus", result);
      return result;
    } finally {
      setExecutingCells(prev => {
        const newSet = new Set(prev);
        newSet.delete(cellId);
        return newSet;
      });
    }
  }, [executeCode]);

  // Ensure we have at least one empty cell for new notebooks
  const ensureMinimumCells = useCallback(() => {
    if (notebookData && notebookData.cells.length === 0) {
      addCell(0, "code");
    }
  }, [notebookData, addCell]);

  // Load initial data - only when autoLoad is true
  useEffect(() => {
    if (!autoLoad) return; // Don't load if autoLoad is false

    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([getNotebook(), getKernelStatus()]);
      setLoading(false);
    };

    loadInitialData();
  }, [getNotebook, getKernelStatus, autoLoad]); // Add autoLoad to dependencies

  // Ensure minimum cells when notebook data changes
  useEffect(() => {
    ensureMinimumCells();
  }, [ensureMinimumCells]);

  return {
    notebookData,
    kernelStatus,
    loading,
    error,
    executingCells,
    getNotebook,
    executeCode,
    executeCellWithStatus,
    getKernelStatus,
    restartKernel,
    rerunNotebook,
    addCell,
    updateCell,
    deleteCell,
  };
};

// Export types for use in UI components
export type { NotebookCellInput };
