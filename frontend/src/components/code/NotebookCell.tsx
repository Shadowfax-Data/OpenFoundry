import { Play, Square, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NotebookCellInput,
  NotebookOutput,
  OutputEventData,
  StreamingEventData,
} from "@/hooks/useNotebookOperations";

import { CodeMirrorEditor } from "./CodeMirrorEditor";

interface NotebookCellProps {
  cell: NotebookCellInput;
  index: number;
  onExecute: (
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
  ) => Promise<void>;
  onUpdateCell: (index: number, cell: NotebookCellInput) => void;
  onDeleteCell: (index: number) => Promise<void>;
  onStopExecution: (cellId: string) => Promise<boolean>;
  isExecuting?: boolean;
}

// Helper function to process base64 image data
const processImageData = (
  data: string | string[],
  mimeType: string,
): string => {
  let base64String = "";

  // Handle array format (from notebook output)
  if (Array.isArray(data)) {
    base64String = data.join("");
  } else {
    base64String = String(data);
  }

  // Remove all whitespace
  base64String = base64String.replace(/\s/g, "");

  // Check if data already contains a data URI prefix
  if (base64String.startsWith("data:")) {
    return base64String;
  }

  // Check if it already starts with the base64 part only
  if (base64String.startsWith(`${mimeType};base64,`)) {
    return `data:${base64String}`;
  }

  // Add the full data URI prefix
  return `data:${mimeType};base64,${base64String}`;
};

export function NotebookCellComponent({
  cell,
  index,
  onExecute,
  onUpdateCell,
  onDeleteCell,
  onStopExecution,
  isExecuting = false,
}: NotebookCellProps) {
  const [cellContent, setCellContent] = useState(
    Array.isArray(cell.source) ? cell.source.join("") : cell.source,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [streamingOutputs, setStreamingOutputs] = useState<NotebookOutput[]>(
    [],
  );
  const [executionStatus, setExecutionStatus] = useState<string>("");

  const handleCellTypeChange = (newType: "code" | "markdown") => {
    const updatedCell = { ...cell, cell_type: newType };
    onUpdateCell(index, updatedCell);
  };

  const handleContentChange = (newContent: string) => {
    setCellContent(newContent);
    const updatedCell = { ...cell, source: newContent };
    onUpdateCell(index, updatedCell);
  };

  const handleExecute = async () => {
    if (cell.cell_type === "code") {
      // Clear streaming outputs when starting new execution
      setStreamingOutputs([]);
      setExecutionStatus("");

      // Execute with streaming (always enabled now)
      await onExecute(cell.id, cellContent, {
        onEvent: (event) => {
          switch (event.event_type) {
            case "started":
              setExecutionStatus("Executing...");
              break;
            case "output":
              if (
                event.data &&
                typeof event.data === "object" &&
                "output" in event.data
              ) {
                const outputData = event.data as OutputEventData;
                setStreamingOutputs((prev) => [...prev, outputData.output]);
              }
              break;
            case "completed":
              setExecutionStatus("Completed");
              // Clear streaming outputs since final outputs will be in cell.outputs
              setTimeout(() => {
                setStreamingOutputs([]);
                setExecutionStatus("");
              }, 1000);
              break;
            case "error": {
              // Check if this is a kernel death error
              const errorData = event.data as { error?: string };
              if (
                errorData.error &&
                errorData.error.toLowerCase().includes("kernel")
              ) {
                setExecutionStatus("Kernel Error - Restarting...");
                // Give more time for kernel restart feedback
                setTimeout(() => {
                  setStreamingOutputs([]);
                  setExecutionStatus("");
                }, 5000);
              } else {
                setExecutionStatus("Error");
                setTimeout(() => {
                  setStreamingOutputs([]);
                  setExecutionStatus("");
                }, 3000);
              }
              break;
            }
            case "interrupted":
              setExecutionStatus("Interrupted");
              // Show interrupted status for longer to give user feedback
              setTimeout(() => {
                setStreamingOutputs([]);
                setExecutionStatus("");
              }, 3000);
              break;
          }
        },
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteCell(index);
    } catch (error) {
      console.error("Failed to delete cell:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStop = async () => {
    try {
      await onStopExecution(cell.id);
    } catch (error) {
      console.error("Failed to stop execution:", error);
    }
  };

  const renderStreamingOutput = () => {
    if (streamingOutputs.length === 0) return null;

    return (
      <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
        <div className="text-xs text-blue-600 mb-2 flex items-center gap-2">
          <div className="animate-pulse">●</div>
          Live Output:
        </div>
        {streamingOutputs.map((output, outputIndex) => (
          <div key={outputIndex} className="mb-2 last:mb-0">
            {output.output_type === "stream" && (
              <pre className="text-sm font-mono whitespace-pre-wrap text-gray-800">
                {Array.isArray(output.text)
                  ? output.text.join("")
                  : output.text}
              </pre>
            )}
            {output.output_type === "execute_result" && output.data && (
              <div className="space-y-2">
                {/* Handle images */}
                {output.data["image/png"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(
                        output.data["image/png"] as string | string[],
                        "image/png",
                      )}
                      alt="Live plot output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {/* Handle text/plain */}
                {output.data["text/plain"] && !output.data["image/png"] && (
                  <div className="text-sm">
                    {Array.isArray(output.data["text/plain"])
                      ? output.data["text/plain"].join("")
                      : output.data["text/plain"]}
                  </div>
                )}
              </div>
            )}
            {output.output_type === "error" && (
              <pre className="text-sm font-mono text-red-600 whitespace-pre-wrap">
                {output.traceback?.join?.("\n") || output.evalue}
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderOutput = () => {
    if (!cell.outputs || cell.outputs.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded border">
        <div className="text-xs text-muted-foreground mb-2">Output:</div>
        {cell.outputs.map((output, outputIndex) => (
          <div key={outputIndex} className="mb-2 last:mb-0">
            {output.output_type === "stream" && (
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {Array.isArray(output.text)
                  ? output.text.join("")
                  : output.text}
              </pre>
            )}
            {output.output_type === "execute_result" && output.data && (
              <div className="space-y-2">
                {/* Handle images */}
                {output.data["image/png"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(
                        output.data["image/png"] as string | string[],
                        "image/png",
                      )}
                      alt="Plot output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/jpeg"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(
                        output.data["image/jpeg"] as string | string[],
                        "image/jpeg",
                      )}
                      alt="Plot output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/svg+xml"] && (
                  <div className="flex justify-center">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: Array.isArray(output.data["image/svg+xml"])
                          ? output.data["image/svg+xml"].join("")
                          : (output.data["image/svg+xml"] as string),
                      }}
                      className="max-w-full"
                    />
                  </div>
                )}
                {/* Handle HTML */}
                {output.data["text/html"] && (
                  <div
                    className="text-sm notebook-output"
                    dangerouslySetInnerHTML={{
                      __html: Array.isArray(output.data["text/html"])
                        ? output.data["text/html"].join("")
                        : (output.data["text/html"] as string),
                    }}
                  />
                )}
                {/* Handle text/plain as HTML when no other format is available */}
                {output.data["text/plain"] &&
                  !output.data["image/png"] &&
                  !output.data["image/jpeg"] &&
                  !output.data["image/svg+xml"] &&
                  !output.data["text/html"] && (
                    <div
                      className="text-sm"
                      dangerouslySetInnerHTML={{
                        __html: Array.isArray(output.data["text/plain"])
                          ? output.data["text/plain"].join("")
                          : (output.data["text/plain"] as string),
                      }}
                    />
                  )}
              </div>
            )}
            {output.output_type === "error" && (
              <pre className="text-sm font-mono text-red-600 whitespace-pre-wrap">
                {output.traceback?.join?.("\n") || output.evalue}
              </pre>
            )}
            {output.output_type === "display_data" && output.data && (
              <div className="space-y-2">
                {/* Handle images */}
                {output.data["image/png"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(
                        output.data["image/png"] as string | string[],
                        "image/png",
                      )}
                      alt="Display output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/jpeg"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(
                        output.data["image/jpeg"] as string | string[],
                        "image/jpeg",
                      )}
                      alt="Display output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/svg+xml"] && (
                  <div className="flex justify-center">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: Array.isArray(output.data["image/svg+xml"])
                          ? output.data["image/svg+xml"].join("")
                          : (output.data["image/svg+xml"] as string),
                      }}
                      className="max-w-full"
                    />
                  </div>
                )}
                {/* Handle HTML */}
                {output.data["text/html"] && (
                  <div
                    className="text-sm notebook-output"
                    dangerouslySetInnerHTML={{
                      __html: Array.isArray(output.data["text/html"])
                        ? output.data["text/html"].join("")
                        : (output.data["text/html"] as string),
                    }}
                  />
                )}
                {/* Handle text/plain as HTML fallback */}
                {output.data["text/plain"] &&
                  !output.data["image/png"] &&
                  !output.data["image/jpeg"] &&
                  !output.data["image/svg+xml"] &&
                  !output.data["text/html"] && (
                    <div
                      className="text-sm"
                      dangerouslySetInnerHTML={{
                        __html: Array.isArray(output.data["text/plain"])
                          ? output.data["text/plain"].join("")
                          : (output.data["text/plain"] as string),
                      }}
                    />
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4 mb-4 group hover:shadow-sm transition-shadow">
      {/* Cell Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Select value={cell.cell_type} onValueChange={handleCellTypeChange}>
            <SelectTrigger className="w-24 h-7">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>

          {cell.cell_type === "code" && cell.execution_count && (
            <span className="text-xs text-muted-foreground">
              [{cell.execution_count}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {cell.cell_type === "code" && (
            <>
              {!isExecuting ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleExecute}
                  title="Execute cell (Ctrl+Enter)"
                >
                  <Play className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                  onClick={handleStop}
                  title="Stop execution"
                >
                  <Square className="h-3 w-3" />
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete cell"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Cell Content */}
      <div className="min-h-[60px]">
        <CodeMirrorEditor
          value={cellContent}
          onChange={handleContentChange}
          onExecute={cell.cell_type === "code" ? handleExecute : undefined}
          language={cell.cell_type === "code" ? "python" : "markdown"}
          placeholder={
            cell.cell_type === "code"
              ? "Enter your code here..."
              : "Enter markdown text here..."
          }
          className="border-0"
        />
      </div>

      {/* Streaming Output */}
      {renderStreamingOutput()}

      {/* Final Output */}
      {renderOutput()}

      {/* Execution Status */}
      {(isExecuting || executionStatus) && (
        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
          {isExecuting && <div className="animate-spin">⟳</div>}
          {executionStatus || "Executing..."}
        </div>
      )}
    </div>
  );
}
