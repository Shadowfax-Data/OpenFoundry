import { useCallback, useState } from "react";

import {
  CompletedEventData,
  ErrorEventData,
  NotebookOutput,
  StreamingEventData,
} from "./types";

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

interface UseNotebookExecutionProps {
  baseUrl: string;
  onCellUpdate?: (
    cellId: string,
    updates: {
      outputs?: NotebookOutput[];
      execution_count?: number | null;
    },
  ) => void;
}

export const useNotebookExecution = ({
  baseUrl,
  onCellUpdate,
}: UseNotebookExecutionProps) => {
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Execute code with streaming using fetch
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
        const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB limit
        let finalResult: ExecuteCodeResponse | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (buffer.length + chunk.length > MAX_BUFFER_SIZE) {
            console.warn("Buffer size exceeded, truncating output");
            setError("Output too large - execution truncated");
            break;
          }
          buffer += chunk;

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

                    // Update cell via callback
                    if (onCellUpdate) {
                      onCellUpdate(eventData.cell_id, {
                        outputs: completedData.outputs || [],
                        execution_count: completedData.execution_count || null,
                      });
                    }
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

        return finalResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to execute code";
        setError(errorMessage);
        console.error("Error executing code with streaming:", err);
        return null;
      }
    },
    [baseUrl, onCellUpdate],
  );

  // Stop execution
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

  // Execute cell with status tracking
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

  // Rerun all cells with streaming
  const rerunNotebook = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch(`${baseUrl}/rerun`, {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to rerun notebook: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB limit

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (buffer.length + chunk.length > MAX_BUFFER_SIZE) {
          console.warn("Buffer size exceeded during rerun, truncating output");
          setError("Rerun output too large - execution truncated");
          break;
        }
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6));

              // Handle error events
              if (eventData.event_type === "error") {
                console.error("Rerun error:", eventData.data?.error);
                throw new Error(eventData.data?.error || "Rerun failed");
              }

              // Update cells via callback for completed cells
              if (eventData.event_type === "completed") {
                const completedData = eventData.data as CompletedEventData;
                if (onCellUpdate) {
                  onCellUpdate(eventData.cell_id, {
                    outputs: completedData.outputs || [],
                    execution_count: completedData.execution_count || null,
                  });
                }
              }

              // Log other events for debugging
              console.log(
                "Rerun event:",
                eventData.event_type,
                eventData.cell_id,
              );
            } catch (parseError) {
              console.error("Error parsing rerun event data:", parseError);
            }
          }
        }
      }

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to rerun notebook";
      setError(errorMessage);
      console.error("Error rerunning notebook:", err);
      return false;
    }
  }, [baseUrl, onCellUpdate]);

  return {
    executingCells,
    executeCodeStreamingFetch,
    executeCellWithStatus,
    stopExecution,
    rerunNotebook,
    error,
    setError,
  };
};
