import { useCallback, useEffect, useState } from "react";

// Define proper types for notebook outputs
export interface NotebookOutputData {
  "text/plain"?: string | string[];
  "text/html"?: string | string[];
  "image/png"?: string | string[];
  "image/jpeg"?: string | string[];
  "image/svg+xml"?: string | string[];
  [mimeType: string]: unknown;
}

export interface StreamOutput {
  output_type: "stream";
  name: "stdout" | "stderr";
  text: string | string[];
}

export interface ExecuteResultOutput {
  output_type: "execute_result";
  execution_count: number;
  data: NotebookOutputData;
  metadata?: Record<string, unknown>;
}

export interface ErrorOutput {
  output_type: "error";
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface DisplayDataOutput {
  output_type: "display_data";
  data: NotebookOutputData;
  metadata?: Record<string, unknown>;
}

export type NotebookOutput =
  | StreamOutput
  | ExecuteResultOutput
  | ErrorOutput
  | DisplayDataOutput;

// Define event data types for streaming
export interface StartedEventData {
  execution_count?: number;
}

export interface OutputEventData {
  output: NotebookOutput;
}

export interface CompletedEventData {
  execution_count: number;
  outputs: NotebookOutput[];
  status: "completed" | "error";
  error?: string;
  started_at: string;
  completed_at: string;
}

export interface ErrorEventData {
  error: string;
  traceback?: string[];
}

export interface InterruptedEventData {
  message?: string;
}

export type StreamingEventData =
  | StartedEventData
  | OutputEventData
  | CompletedEventData
  | ErrorEventData
  | InterruptedEventData;

export interface NotebookCell {
  id: string;
  cell_type: "code" | "markdown";
  source: string[];
  outputs?: NotebookOutput[];
  execution_count?: number | null;
}

// Type for UI components that can handle both string and string[] sources
export interface NotebookCellInput {
  id: string;
  cell_type: "code" | "markdown";
  source: string[] | string;
  outputs?: NotebookOutput[];
  execution_count?: number | null;
}

export interface NotebookMetadata {
  kernelspec?: {
    display_name: string;
    language: string;
    name: string;
  };
  language_info?: {
    codemirror_mode?: {
      name: string;
      version?: number;
    };
    file_extension: string;
    mimetype: string;
    name: string;
    nbconvert_exporter: string;
    pygments_lexer: string;
    version: string;
  };
  [key: string]: unknown;
}

export interface NotebookData {
  cells: NotebookCell[];
  metadata: NotebookMetadata;
  nbformat: number;
  nbformat_minor: number;
}

export interface KernelStatus {
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
  code: string;
  execution_count: number;
  outputs: NotebookOutput[];
  status: "completed" | "error";
  error?: string;
  started_at: string;
  completed_at: string;
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

      // Ensure all cells have frontend_cell_ids
      if (data && data.cells) {
        data.cells = data.cells.map((cell: NotebookCell) => ({
          ...cell,
          id:
            cell.id ||
            `backend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // Execute code with streaming output
  const executeCodeStreaming = useCallback(
    (
      request: ExecuteCodeRequest,
      onEvent?: (event: {
        event_type: "started" | "output" | "completed" | "error";
        cell_id: string;
        timestamp: string;
        data: StreamingEventData;
      }) => void,
    ): Promise<ExecuteCodeResponse | null> => {
      return new Promise((resolve, reject) => {
        setError(null);

        const eventSource = new EventSource(`${baseUrl}/execute/stream`, {
          // Note: EventSource doesn't support POST by default
          // We'll need to implement this differently
        });

        let finalResult: ExecuteCodeResponse | null = null;

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Call the event handler if provided
            if (onEvent) {
              onEvent(data);
            }

            // Handle different event types
            switch (data.event_type) {
              case "started": {
                console.log(`Execution started for cell ${data.cell_id}`);
                break;
              }

              case "output": {
                console.log(
                  `Output received for cell ${data.cell_id}:`,
                  data.data.output,
                );
                // You could update the notebook display here in real-time
                break;
              }

              case "completed": {
                const completedData = data.data as CompletedEventData;
                finalResult = {
                  cell_id: data.cell_id,
                  code: request.code,
                  execution_count: completedData.execution_count || 0,
                  outputs: completedData.outputs || [],
                  status: completedData.status,
                  error: completedData.error,
                  started_at: completedData.started_at,
                  completed_at: completedData.completed_at,
                };
                eventSource.close();
                getNotebook().then(() => resolve(finalResult));
                break;
              }

              case "error": {
                eventSource.close();
                const errorData = data.data as ErrorEventData;
                const errorMessage = errorData.error || "Execution failed";
                setError(errorMessage);
                reject(new Error(errorMessage));
                break;
              }
            }
          } catch (err) {
            console.error("Error parsing event data:", err);
            eventSource.close();
            reject(err);
          }
        };

        eventSource.onerror = (error) => {
          console.error("EventSource error:", error);
          eventSource.close();
          setError("Connection error during execution");
          reject(new Error("Connection error during execution"));
        };

        // Since EventSource doesn't support POST, we'll need to use fetch with streaming
        // This is a placeholder - we'll implement the actual streaming below
      });
    },
    [baseUrl, getNotebook],
  );

  // Execute code with streaming using fetch (since EventSource doesn't support POST)
  const executeCodeStreamingFetch = useCallback(
    async (
      request: ExecuteCodeRequest,
      onEvent?: (event: {
        event_type:
          | "started"
          | "output"
          | "completed"
          | "error"
          | "interrupted";
        cell_id: string;
        timestamp: string;
        data: StreamingEventData;
      }) => void,
    ): Promise<ExecuteCodeResponse | null> => {
      try {
        setError(null);

        const response = await fetch(`${baseUrl}/execute/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Failed to execute code: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body reader available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let finalResult: ExecuteCodeResponse | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const eventData = JSON.parse(line.slice(6));

                // Call the event handler if provided
                if (onEvent) {
                  onEvent(eventData);
                }

                // Handle different event types
                switch (eventData.event_type) {
                  case "started": {
                    console.log(
                      `Execution started for cell ${eventData.cell_id}`,
                    );
                    break;
                  }

                  case "output": {
                    console.log(
                      `Output received for cell ${eventData.cell_id}:`,
                      eventData.data.output,
                    );
                    break;
                  }

                  case "completed": {
                    const completedData = eventData.data as CompletedEventData;
                    finalResult = {
                      cell_id: eventData.cell_id,
                      code: request.code,
                      execution_count: completedData.execution_count || 0,
                      outputs: completedData.outputs || [],
                      status: completedData.status,
                      error: completedData.error,
                      started_at: completedData.started_at,
                      completed_at: completedData.completed_at,
                    };
                    break;
                  }

                  case "error": {
                    const errorData = eventData.data as ErrorEventData;
                    const errorMessage = errorData.error || "Execution failed";
                    setError(errorMessage);
                    throw new Error(errorMessage);
                  }
                }
              } catch (parseError) {
                console.error("Error parsing event data:", parseError);
              }
            }
          }
        }

        // Refresh notebook data after execution
        await getNotebook();
        return finalResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to execute code";
        setError(errorMessage);
        console.error("Error executing code with streaming:", err);
        return null;
      }
    },
    [baseUrl, getNotebook],
  );

  // Get kernel status
  const getKernelStatus =
    useCallback(async (): Promise<KernelStatus | null> => {
      try {
        setError(null);
        const response = await fetch(`${baseUrl}/status`);

        if (!response.ok) {
          throw new Error(
            `Failed to get kernel status: ${response.statusText}`,
          );
        }

        const status = await response.json();
        setKernelStatus(status);
        return status;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to get kernel status";
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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to restart kernel";
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
      const errorMessage =
        err instanceof Error ? err.message : "Failed to rerun notebook";
      setError(errorMessage);
      console.error("Error rerunning notebook:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [baseUrl, getNotebook]);

  // Cell management functions
  const addCell = useCallback(
    (index: number, cellType: "code" | "markdown" = "code") => {
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
    },
    [notebookData],
  );

  const updateCell = useCallback(
    (index: number, updatedCell: NotebookCellInput) => {
      if (!notebookData) return;

      // Normalize the source to always be a string array
      const normalizedCell: NotebookCell = {
        ...updatedCell,
        source: Array.isArray(updatedCell.source)
          ? updatedCell.source
          : [updatedCell.source],
      };

      const newCells = [...notebookData.cells];
      newCells[index] = normalizedCell;

      setNotebookData({
        ...notebookData,
        cells: newCells,
      });
    },
    [notebookData],
  );

  const deleteCell = useCallback(
    async (index: number) => {
      if (!notebookData || index < 0 || index >= notebookData.cells.length)
        return;

      const cellToDelete = notebookData.cells[index];
      const cellId = cellToDelete.id;

      try {
        setError(null);
        const response = await fetch(`${baseUrl}/cells/${cellId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete cell: ${response.statusText}`);
        }

        // After successful deletion, refresh the notebook data to get the updated state
        await getNotebook();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete cell";
        setError(errorMessage);
        console.error("Error deleting cell:", err);
      }
    },
    [notebookData, baseUrl, getNotebook],
  );

  const stopExecution = useCallback(
    async (cellId: string): Promise<boolean> => {
      try {
        setError(null);

        const endpoint = `${baseUrl}/stop_cell_execution/${encodeURIComponent(cellId)}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to stop cell execution: ${response.statusText}`,
          );
        }

        const result = await response.json();
        return result.success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to stop cell execution";
        setError(errorMessage);
        console.error("Error stopping cell execution:", err);
        return false;
      }
    },
    [baseUrl],
  );

  const executeCellWithStatus = useCallback(
    async (
      cellId: string,
      code: string,
      options?: {
        onEvent?: (event: {
          event_type:
            | "started"
            | "output"
            | "completed"
            | "error"
            | "interrupted";
          cell_id: string;
          timestamp: string;
          data: StreamingEventData;
        }) => void;
      },
    ): Promise<void> => {
      setExecutingCells((prev) => new Set(prev).add(cellId));

      try {
        const executeRequest: ExecuteCodeRequest = {
          code,
          cell_id: cellId,
        };

        // Always use streaming execution
        await executeCodeStreamingFetch(executeRequest, options?.onEvent);
      } finally {
        setExecutingCells((prev) => {
          const newSet = new Set(prev);
          newSet.delete(cellId);
          return newSet;
        });
      }
    },
    [executeCodeStreamingFetch],
  );

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
    executeCodeStreaming,
    executeCodeStreamingFetch,
    executeCellWithStatus,
    stopExecution,
    getKernelStatus,
    restartKernel,
    rerunNotebook,
    addCell,
    updateCell,
    deleteCell,
  };
};
