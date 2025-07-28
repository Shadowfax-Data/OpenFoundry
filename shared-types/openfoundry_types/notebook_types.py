"""Notebook-related types and models for CellExecutor and API."""

from typing import List, Dict, Any
from pydantic import BaseModel, Field


class CellInfo(BaseModel):
    """Information about a single notebook cell."""
    cell_index: int = Field(..., description="Index of the cell in the notebook")
    cell_type: str = Field(..., description="Type of cell (code, markdown, etc.)")
    source: str = Field(..., description="Source code/content of the cell")
    execution_count: int | None = Field(None, description="Execution count if applicable")
    outputs: List[Dict[str, Any]] | None = Field(None, description="Cell outputs if any")


class TailCellsResult(BaseModel):
    """Result from CellExecutor.tail_cells method."""
    total_cells: int = Field(..., description="Total number of cells in the notebook")
    returned_cells: int = Field(..., description="Number of cells returned")
    start_index: int = Field(..., description="Starting index of returned cells")
    cells: List[CellInfo] = Field(..., description="List of cell information")


class KernelStatusResponse(BaseModel):
    """Response model for kernel status."""
    is_ready: bool = Field(..., description="Whether the kernel is ready for execution")
    is_starting: bool = Field(
        ..., description="Whether the kernel is currently starting or initializing"
    )
    is_initializing: bool = Field(
        ..., description="Whether the kernel is running initial auto-execution"
    )
    kernel_id: str | None = Field(None, description="Unique kernel identifier")


class ExecuteCodeRequest(BaseModel):
    """Request model for executing code in the Jupyter kernel."""
    code: str = Field(..., description="Python code to execute")
    cell_id: str = Field(..., description="Unique identifier for this cell execution")


class DeleteCellRequest(BaseModel):
    """Request model for deleting a cell."""
    cell_id: str = Field(..., description="Unique identifier of the cell to delete")


class DeleteCellResponse(BaseModel):
    """Response model for cell deletion."""
    success: bool = Field(..., description="Whether the deletion was successful")
    message: str = Field(..., description="Deletion result message")
    cell_id: str = Field(..., description="ID of the cell that was deleted")


class StopExecutionRequest(BaseModel):
    """Request model for stopping cell execution."""
    cell_id: str | None = Field(
        None,
        description="Optional specific cell ID to stop (if not provided, stops any currently executing cell)",
    )


class StopExecutionResponse(BaseModel):
    """Response model for stopping execution."""
    success: bool = Field(..., description="Whether the stop operation was successful")
    message: str = Field(..., description="Result message")


class ExecutionResult(BaseModel):
    """Result from cell execution operations."""
    success: bool = Field(..., description="Whether execution was successful")
    cell_id: str = Field(..., description="ID of the executed cell")
    execution_count: int | None = Field(None, description="Execution count if applicable")
    outputs: List[Dict[str, Any]] = Field(..., description="Cell outputs")
    error: str | None = Field(None, description="Error message if execution failed")


class InterruptResult(BaseModel):
    """Result from interrupt operations."""
    success: bool = Field(..., description="Whether interrupt was successful")
    message: str = Field(..., description="Result message")


class DeletionResult(BaseModel):
    """Result from cell deletion operations."""
    success: bool = Field(..., description="Whether deletion was successful")
    cell_id: str = Field(..., description="ID of the deleted cell")
    message: str = Field(..., description="Result message")
