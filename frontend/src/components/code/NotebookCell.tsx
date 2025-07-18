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
            {output.output_type === "execute_result" && (
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {output.data?.["text/plain"]?.join?.("") || output.data?.["text/plain"]}
              </pre>
            )}
            {output.output_type === "error" && (
              <pre className="text-sm font-mono text-red-600 whitespace-pre-wrap">
                {output.traceback?.join?.("\n") || output.evalue}
              </pre>
            )}
            {output.output_type === "display_data" && output.data?.["text/html"] && (
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{
                  __html: output.data["text/html"].join?.("") || output.data["text/html"]
                }}
              />
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
