import { Play, Plus,Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NotebookCellInput } from "@/hooks/useNotebookOperations";

interface NotebookCellProps {
  cell: NotebookCellInput;
  index: number;
  onExecute: (cellId: string, code: string) => Promise<void>;
  onUpdateCell: (index: number, cell: NotebookCellInput) => void;
  onAddCell: (index: number, cellType: "code" | "markdown") => void;
  onDeleteCell: (index: number) => void;
  isExecuting?: boolean;
}

// Helper function to process base64 image data
const processImageData = (data: any, mimeType: string): string => {
  let base64String = '';

  // Handle array format (from notebook output)
  if (Array.isArray(data)) {
    base64String = data.join('');
  } else {
    base64String = String(data);
  }

  // Remove all whitespace
  base64String = base64String.replace(/\s/g, '');

  // Check if data already contains a data URI prefix
  if (base64String.startsWith('data:')) {
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
  onAddCell,
  onDeleteCell,
  isExecuting = false,
}: NotebookCellProps) {
  const [cellContent, setCellContent] = useState(
    Array.isArray(cell.source) ? cell.source.join("") : cell.source
  );

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
      await onExecute(cell.id, cellContent);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExecute();
    }
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
                {output.text?.join?.("") || output.text}
              </pre>
            )}
            {output.output_type === "execute_result" && output.data && (
              <div className="space-y-2">
                {/* Handle images */}
                {output.data["image/png"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(output.data["image/png"], "image/png")}
                      alt="Plot output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/jpeg"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(output.data["image/jpeg"], "image/jpeg")}
                      alt="Plot output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/svg+xml"] && (
                  <div className="flex justify-center">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: Array.isArray(output.data["image/svg+xml"]) ? output.data["image/svg+xml"].join('') : output.data["image/svg+xml"]
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
                      __html: Array.isArray(output.data["text/html"]) ? output.data["text/html"].join('') : output.data["text/html"]
                    }}
                  />
                )}
                {/* Handle text/plain as HTML when no other format is available */}
                {output.data["text/plain"] && !output.data["image/png"] && !output.data["image/jpeg"] && !output.data["image/svg+xml"] && !output.data["text/html"] && (
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{
                      __html: Array.isArray(output.data["text/plain"]) ? output.data["text/plain"].join('') : output.data["text/plain"]
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
                      src={processImageData(output.data["image/png"], "image/png")}
                      alt="Display output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/jpeg"] && (
                  <div className="flex justify-center">
                    <img
                      src={processImageData(output.data["image/jpeg"], "image/jpeg")}
                      alt="Display output"
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                )}
                {output.data["image/svg+xml"] && (
                  <div className="flex justify-center">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: Array.isArray(output.data["image/svg+xml"]) ? output.data["image/svg+xml"].join('') : output.data["image/svg+xml"]
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
                      __html: Array.isArray(output.data["text/html"]) ? output.data["text/html"].join('') : output.data["text/html"]
                    }}
                  />
                )}
                {/* Handle text/plain as HTML fallback */}
                {output.data["text/plain"] && !output.data["image/png"] && !output.data["image/jpeg"] && !output.data["image/svg+xml"] && !output.data["text/html"] && (
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{
                      __html: Array.isArray(output.data["text/plain"]) ? output.data["text/plain"].join('') : output.data["text/plain"]
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
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleExecute}
              disabled={isExecuting}
              title="Execute cell (Ctrl+Enter)"
            >
              <Play className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onAddCell(index + 1, "code")}
            title="Add cell below"
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
            onClick={() => onDeleteCell(index)}
            title="Delete cell"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Cell Content */}
      <div className="min-h-[60px]">
        <Textarea
          value={cellContent}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            cell.cell_type === "code"
              ? "Enter your code here..."
              : "Enter markdown text here..."
          }
          className={`min-h-[60px] resize-none font-mono text-sm border-0 focus:ring-0 focus:border-0 p-0 ${
            cell.cell_type === "markdown" ? "font-sans" : ""
          }`}
        />
      </div>

      {/* Output */}
      {renderOutput()}

      {/* Execution Status */}
      {isExecuting && (
        <div className="mt-2 text-sm text-muted-foreground">
          Executing...
        </div>
      )}
    </div>
  );
}
