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

interface StreamingEvent {
  event_type: "started" | "output" | "completed" | "error" | "interrupted";
  cell_id: string;
  timestamp: string;
  data: StreamingEventData;
}

interface StreamingOptions {
  onEvent?: (event: StreamingEvent) => void;
  onCompleted?: (
    eventData: StreamingEvent,
    completedData: CompletedEventData,
  ) => void;
  onError?: (errorMessage: string) => void;
  bufferSizeExceededMessage?: string;
}

export const useNotebookExecution = ({
  baseUrl,
  onCellUpdate,
}: UseNotebookExecutionProps) => {
  const [executingCells, setExecutingCells] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Helper function to handle streaming responses
  const processStreamingResponse = useCallback(
    async (
      response: Response,
      options: StreamingOptions = {},
    ): Promise<void> => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB limit

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (buffer.length + chunk.length > MAX_BUFFER_SIZE) {
          const message =
            options.bufferSizeExceededMessage ||
            "Buffer size exceeded, truncating output";
          console.warn(message);
          if (options.onError) {
            options.onError(message);
          }
          break;
        }
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData: StreamingEvent = JSON.parse(line.slice(6));

              // Call the event handler if provided
              if (options.onEvent) {
                options.onEvent(eventData);
              }

              // Handle completed events with callback
              if (eventData.event_type === "completed" && options.onCompleted) {
                const completedData = eventData.data as CompletedEventData;
                options.onCompleted(eventData, completedData);
              }

              // Handle error events
              if (eventData.event_type === "error") {
                const errorData = eventData.data as ErrorEventData;
                const errorMessage = errorData.error || "Execution failed";
                if (options.onError) {
                  options.onError(errorMessage);
                }
                throw new Error(errorMessage);
              }
            } catch (parseError) {
              console.error("Error parsing event data:", parseError);
            }
          }
        }
      }
    },
    [],
  );

  // Execute code with streaming using fetch
  const executeCodeStreamingFetch = useCallback(
    async (
      request: ExecuteCodeRequest,
      onEvent?: (event: StreamingEvent) => void,
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

        let finalResult: ExecuteCodeResponse | null = null;

        await processStreamingResponse(response, {
          onEvent: (eventData) => {
            if (onEvent) {
              onEvent(eventData);
            }

            // Handle different event types for logging
            switch (eventData.event_type) {
              case "started":
                console.log(`Execution started for cell ${eventData.cell_id}`);
                break;
              case "output":
                console.log(
                  `Output received for cell ${eventData.cell_id}:`,
                  eventData.data,
                );
                break;
            }
          },
          onCompleted: (eventData, completedData) => {
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
          },
          onError: (errorMessage) => {
            setError(errorMessage);
          },
          bufferSizeExceededMessage: "Output too large - execution truncated",
        });

        return finalResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to execute code";
        setError(errorMessage);
        console.error("Error executing code with streaming:", err);
        return null;
      }
    },
    [baseUrl, onCellUpdate, processStreamingResponse],
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
        onEvent?: (event: StreamingEvent) => void;
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
      await processStreamingResponse(response, {
        onEvent: (eventData) => {
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
          console.log("Rerun event:", eventData.event_type, eventData.cell_id);
        },
        onError: (errorMessage) => {
          setError(errorMessage);
        },
        bufferSizeExceededMessage:
          "Rerun output too large - execution truncated",
      });

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to rerun notebook";
      setError(errorMessage);
      console.error("Error rerunning notebook:", err);
      return false;
    }
  }, [baseUrl, onCellUpdate, processStreamingResponse]);

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
