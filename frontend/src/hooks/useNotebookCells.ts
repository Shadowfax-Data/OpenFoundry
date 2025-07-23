import { useCallback, useEffect } from "react";

import { NotebookCell, NotebookCellInput, NotebookData } from "./types";

interface UseNotebookCellsProps {
  notebookData: NotebookData | null;
  setNotebookData: React.Dispatch<React.SetStateAction<NotebookData | null>>;
  baseUrl: string;
  getNotebook: () => Promise<NotebookData | null>;
  setError: (error: string | null) => void;
}

export const useNotebookCells = ({
  notebookData,
  setNotebookData,
  baseUrl,
  getNotebook,
  setError,
}: UseNotebookCellsProps) => {
  // Add a new cell
  const addCell = useCallback(
    (index: number, cellType: "code" | "markdown" = "code") => {
      const newCell: NotebookCell = {
        id: crypto.randomUUID(),
        cell_type: cellType,
        source: [],
        outputs: [],
        execution_count: null,
      };

      setNotebookData((prev) => {
        if (!prev) return prev;
        const newCells = [...prev.cells];
        newCells.splice(index, 0, newCell);
        return { ...prev, cells: newCells };
      });
    },
    [setNotebookData],
  );

  // Update an existing cell
  const updateCell = useCallback(
    (index: number, updatedCell: NotebookCellInput) => {
      // Normalize the source to always be a string array
      const normalizedCell: NotebookCell = {
        ...updatedCell,
        source: Array.isArray(updatedCell.source)
          ? updatedCell.source
          : [updatedCell.source],
      };

      setNotebookData((prev) => {
        if (!prev) return prev;
        const newCells = [...prev.cells];
        newCells[index] = normalizedCell;
        return { ...prev, cells: newCells };
      });
    },
    [setNotebookData],
  );

  // Update a cell by ID (useful for execution updates)
  const updateCellById = useCallback(
    (
      cellId: string,
      updates: {
        outputs?: NotebookCell["outputs"];
        execution_count?: NotebookCell["execution_count"];
        source?: NotebookCell["source"];
      },
    ) => {
      setNotebookData((prev) => {
        if (!prev) return prev;

        const updatedCells = prev.cells.map((cell) => {
          if (cell.id === cellId) {
            return { ...cell, ...updates };
          }
          return cell;
        });

        return { ...prev, cells: updatedCells };
      });
    },
    [setNotebookData],
  );

  // Delete a cell
  const deleteCell = useCallback(
    async (index: number) => {
      // Get cell info using functional approach to avoid stale closure
      let cellId: string | null = null;
      setNotebookData((prev) => {
        if (!prev || index < 0 || index >= prev.cells.length) {
          return prev;
        }
        cellId = prev.cells[index].id;
        return prev;
      });

      if (!cellId) return;

      try {
        setError(null);
        const response = await fetch(`${baseUrl}/cells/${cellId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Failed to delete cell: ${response.statusText}`);
        }

        // After successful deletion, refresh the notebook data
        await getNotebook();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete cell";
        setError(errorMessage);
        console.error("Error deleting cell:", err);
      }
    },
    [baseUrl, getNotebook, setError, setNotebookData],
  );

  // Ensure we have at least one empty cell for new notebooks
  const ensureMinimumCells = useCallback(() => {
    if (notebookData && notebookData.cells.length === 0) {
      addCell(0, "code");
    }
  }, [notebookData, addCell]);

  // Ensure minimum cells when notebook data changes
  useEffect(() => {
    ensureMinimumCells();
  }, [ensureMinimumCells]);

  return {
    addCell,
    updateCell,
    updateCellById,
    deleteCell,
    ensureMinimumCells,
  };
};
