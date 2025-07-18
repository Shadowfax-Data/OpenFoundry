import { Plus, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotebookCellInput } from "@/hooks/useNotebookOperations";

import { NotebookCellComponent } from "./NotebookCell";

interface NotebookData {
  cells: NotebookCellInput[];
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

interface InteractiveNotebookProps {
  notebookData: NotebookData | null;
  kernelStatus: KernelStatus | null;
  loading: boolean;
  error: string | null;
  executingCells: Set<string>;
  onExecuteCell: (cellId: string, code: string) => Promise<any>;
  onUpdateCell: (index: number, cell: NotebookCellInput) => void;
  onAddCell: (index: number, cellType: "code" | "markdown") => void;
  onDeleteCell: (index: number) => void;
  onRestartKernel: () => Promise<boolean>;
  onRerunNotebook: () => Promise<boolean>;
  onSaveWorkspace?: () => Promise<void>;
}

export function InteractiveNotebook({
  notebookData,
  kernelStatus,
  loading,
  error,
  executingCells,
  onExecuteCell,
  onUpdateCell,
  onAddCell,
  onDeleteCell,
  onRestartKernel,
  onRerunNotebook,
  onSaveWorkspace,
}: InteractiveNotebookProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading notebook...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold mb-2">Error loading notebook</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!notebookData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">No notebook data available</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Notebook Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Jupyter Notebook</h3>
            {kernelStatus && (
              <div className="text-sm text-muted-foreground">
                Kernel: {kernelStatus.is_ready ? (
                  <span className="text-green-600">Ready</span>
                ) : kernelStatus.is_starting ? (
                  <span className="text-yellow-600">Starting...</span>
                ) : (
                  <span className="text-red-600">Not Ready</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddCell(0, "code")}
              title="Add cell at top"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Cell
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onRerunNotebook}
              title="Rerun all cells"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Rerun All
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onRestartKernel}
              title="Restart kernel"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restart Kernel
            </Button>

            {onSaveWorkspace && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveWorkspace}
                title="Save workspace"
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Notebook Content */}
      <div className="flex-1 overflow-auto p-4">
        {notebookData.cells.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">This notebook is empty</p>
            <Button
              onClick={() => onAddCell(0, "code")}
              className="mx-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add your first cell
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {notebookData.cells.map((cell, index) => (
              <NotebookCellComponent
                key={cell.id}
                cell={cell}
                index={index}
                onExecute={onExecuteCell}
                onUpdateCell={onUpdateCell}
                onAddCell={onAddCell}
                onDeleteCell={onDeleteCell}
                isExecuting={executingCells.has(cell.id)}
              />
            ))}

            {/* Add cell button at the bottom */}
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={() => onAddCell(notebookData.cells.length, "code")}
                className="w-full max-w-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Cell
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
