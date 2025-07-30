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
} from "@/hooks/types";

import { CodeMirrorEditor } from "./CodeMirrorEditor";
import { NotebookOutputItem } from "./NotebookOutputItem";

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
            <NotebookOutputItem output={output} isStreaming={true} />
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
            <NotebookOutputItem output={output} isStreaming={false} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="border rounded-lg p-4 mb-4 group hover:shadow-sm transition-shadow"
      data-cell-index={index}
    >
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
