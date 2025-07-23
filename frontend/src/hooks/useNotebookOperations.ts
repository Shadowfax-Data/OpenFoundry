import { useCallback, useEffect } from "react";

import { useKernelStatus } from "./useKernelStatus";
import { useNotebookCells } from "./useNotebookCells";
import { useNotebookData } from "./useNotebookData";
import { useNotebookExecution } from "./useNotebookExecution";

// Re-export types for backward compatibility
export type {
  CompletedEventData,
  DisplayDataOutput,
  ErrorEventData,
  ErrorOutput,
  ExecuteResultOutput,
  InterruptedEventData,
  NotebookCell,
  NotebookCellInput,
  NotebookData,
  NotebookMetadata,
  NotebookOutput,
  NotebookOutputData,
  OutputEventData,
  StartedEventData,
  StreamingEventData,
  StreamOutput,
} from "./types";
export { KernelStatus } from "./useKernelStatus";

// Import types from the types file
import { NotebookData, NotebookOutput } from "./types";

interface UseNotebookOperationsProps {
  notebookId: string;
  sessionId: string;
  autoLoad?: boolean;
}

export const useNotebookOperations = ({
  notebookId,
  sessionId,
  autoLoad = true,
}: UseNotebookOperationsProps) => {
  // Use the focused hooks
  const {
    notebookData,
    setNotebookData,
    loading,
    error: dataError,
    setError: setDataError,
    getNotebook,
    baseUrl,
  } = useNotebookData({ notebookId, sessionId, autoLoad });

  const {
    kernelStatus,
    getKernelStatus,
    error: kernelError,
    setError: setKernelError,
  } = useKernelStatus({ baseUrl });

  // Create a callback to update cells from execution results
  const handleCellUpdate = useCallback(
    (
      cellId: string,
      updates: {
        outputs?: NotebookOutput[];
        execution_count?: number | null;
      },
    ) => {
      setNotebookData((prevData: NotebookData | null) => {
        if (!prevData) return prevData;

        const updatedCells = prevData.cells.map((cell) => {
          if (cell.id === cellId) {
            return { ...cell, ...updates };
          }
          return cell;
        });

        return { ...prevData, cells: updatedCells };
      });
    },
    [setNotebookData],
  );

  const {
    executingCells,
    executeCodeStreamingFetch,
    executeCellWithStatus,
    stopExecution,
    rerunNotebook,
    error: executionError,
    setError: setExecutionError,
  } = useNotebookExecution({ baseUrl, onCellUpdate: handleCellUpdate });

  const { addCell, updateCell, deleteCell } = useNotebookCells({
    notebookData,
    setNotebookData,
    baseUrl,
    getNotebook,
    setError: setDataError,
  });

  // Combine errors from all hooks
  const error = dataError || kernelError || executionError;
  const setError = useCallback(
    (newError: string | null) => {
      setDataError(newError);
      setKernelError(newError);
      setExecutionError(newError);
    },
    [setDataError, setKernelError, setExecutionError],
  );

  // Load kernel status on mount if autoLoad is enabled
  useEffect(() => {
    if (!autoLoad) return;

    const loadKernelStatus = async () => {
      await getKernelStatus();
    };

    loadKernelStatus();
  }, [getKernelStatus, autoLoad]);

  // Return the same API as before for backward compatibility
  return {
    notebookData,
    kernelStatus,
    loading,
    error,
    executingCells,
    getNotebook,
    executeCodeStreamingFetch,
    executeCellWithStatus,
    stopExecution,
    getKernelStatus,
    rerunNotebook,
    addCell,
    updateCell,
    deleteCell,
    setError,
  };
};
