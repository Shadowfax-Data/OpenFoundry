import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from nbclient import NotebookClient
from nbformat import NotebookNode
from nbformat.v4 import new_code_cell, new_notebook
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ExecuteCodeResponse(BaseModel):
    """Response model for code execution."""

    cell_id: str = Field(..., description="Unique identifier for this execution")
    code: str = Field(..., description="The executed code")
    execution_count: int = Field(
        ...,
        description="Execution count for this cell execution (increments for each cell execution in the session)",
    )
    outputs: list[dict[str, Any]] = Field(
        default_factory=list,
        description="List of outputs from execution (native Jupyter format)",
    )
    status: str = Field(..., description="Execution status (completed, error)")
    error: str | None = Field(None, description="Error message if execution failed")
    started_at: str = Field(..., description="ISO timestamp when execution started")
    completed_at: str = Field(..., description="ISO timestamp when execution completed")


# Custom exceptions
class KernelNotReadyError(Exception):
    """Exception raised when the kernel is not ready for execution."""

    def __init__(self, message: str = "Kernel is not ready for execution"):
        super().__init__(message)


class JupyterKernelManager:
    """Manages a persistent Jupyter kernel for code execution using nbclient."""

    def __init__(self):
        self.client: NotebookClient | None = None
        self.nb = new_notebook()
        self.kernel_id: str | None = None
        self.is_starting = False
        self.is_ready = False
        self._lock = asyncio.Lock()

    def _get_or_create_cell(self, code: str, cell_id: str) -> NotebookNode:
        """
        Get or create a cell for execution.

        Args:
            code: The code to be executed
            cell_id: Cell ID. If it matches an existing cell, updates that cell's code.
                    If it doesn't match, creates a new cell with this ID.

        Returns:
            The cell node
        """
        # Check if cell with provided ID already exists
        for cell in self.nb.cells:
            if cell.id == cell_id:
                # Cell already exists, update its code and return
                cell.source = code
                return cell

        # Cell doesn't exist, create new cell with the provided ID
        cell = new_code_cell(source=code)
        cell.id = cell_id  # Set the specific ID
        self.nb.cells.append(cell)
        return cell

    async def start_kernel(self):
        """Start the Jupyter kernel asynchronously."""
        async with self._lock:
            return await self._start_kernel()

    async def _start_kernel(self):
        """Internal implementation of start_kernel with lock protection."""
        if self.is_starting or self.is_ready:
            return self.is_ready

        self.is_starting = True
        try:
            logger.info("Starting Jupyter Python kernel...")

            self.client = NotebookClient(self.nb, kernel_name="python3")

            assert self.client is not None, "Kernel client is not initialized"

            # Create kernel manager first
            self.client.create_kernel_manager()

            # Now start the kernel
            await self.client.async_start_new_kernel()

            # Create and start kernel client
            await self.client.async_start_new_kernel_client()

            self.kernel_id = str(uuid.uuid4())
            self.is_ready = True

            logger.info("Jupyter kernel started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start kernel: {e}")
            self.client = None
            self.is_ready = False
            raise e
        finally:
            self.is_starting = False

    async def restart_kernel(self):
        """Restart the kernel, clearing all state."""
        async with self._lock:
            return await self._restart_kernel()

    async def _restart_kernel(self):
        """Internal implementation of restart_kernel with lock protection."""
        logger.info("Restarting kernel...")

        # Stop existing kernel
        if self.client is not None and self.client.km is not None:
            await asyncio.to_thread(self.client.km.shutdown_kernel, now=True)

        # Clear state
        self.client = None
        self.nb = new_notebook()
        self.kernel_id = None
        self.is_ready = False

        # Start new kernel
        await self._start_kernel()

    async def _execute_single_cell(self, cell: NotebookNode) -> ExecuteCodeResponse:
        """
        Execute a single cell and return the execution response.

        Args:
            cell: The notebook cell to execute

        Returns:
            ExecuteCodeResponse with execution results
        """
        started_at = datetime.now(timezone.utc).isoformat()

        try:
            assert self.client is not None, "Kernel client is not initialized"

            # Execute the cell using the notebook client
            await self.client.async_execute_cell(cell, cell_index=0)

            # Parse outputs from the executed cell
            outputs = list(cell.outputs)  # NotebookNode is already dict-compatible
            status_result = "completed"
            error_msg = None

            # Extract error message if any error outputs exist
            error_messages = [
                f"{output.get('ename', 'Error')}: {output.get('evalue', 'Unknown error')}"
                for output in outputs
                if output.get("output_type") == "error"
            ]
            error_msg = "; ".join(error_messages) if error_messages else None

            completed_at = datetime.now(timezone.utc).isoformat()

            # Create response
            response = ExecuteCodeResponse(
                cell_id=cell.id,
                code=cell.source,
                execution_count=cell.execution_count or 0,
                outputs=outputs,
                status=status_result,
                error=error_msg,
                started_at=started_at,
                completed_at=completed_at,
            )

            return response

        except Exception as e:
            completed_at = datetime.now(timezone.utc).isoformat()
            logger.error(f"Error executing cell (ID: {cell.id}): {e}")

            error_response = ExecuteCodeResponse(
                cell_id=cell.id,
                code=cell.source,
                execution_count=getattr(cell, "execution_count", 0) or 0,
                outputs=[],
                status="error",
                error=str(e),
                started_at=started_at,
                completed_at=completed_at,
            )

            return error_response

    async def _ensure_kernel_ready(self):
        """
        Ensure the kernel is ready for execution.

        If the kernel is not ready, attempts to start it.
        Raises KernelNotReadyError if the kernel cannot be made ready.

        Raises:
            KernelNotReadyError: If kernel is not ready for execution after startup attempt
        """
        if not self._is_kernel_ready():
            if not self.is_starting:
                await self._start_kernel()
            if not self._is_kernel_ready():
                raise KernelNotReadyError("Kernel is not ready for execution")

    async def rerun_notebook(self) -> list[ExecuteCodeResponse]:
        """Re-run all cells in the notebook in order and return their execution results."""
        async with self._lock:
            return await self._rerun_notebook()

    async def _rerun_notebook(self) -> list[ExecuteCodeResponse]:
        """Internal implementation of rerun_notebook with lock protection."""
        await self._ensure_kernel_ready()

        logger.info(f"Re-running all {len(self.nb.cells)} cells in notebook")

        results = []

        for i, cell in enumerate(self.nb.cells):
            if cell.cell_type != "code":
                continue  # Skip non-code cells

            logger.info(f"Re-running cell {i+1}/{len(self.nb.cells)} (ID: {cell.id})")

            # Execute the cell using the common method
            response = await self._execute_single_cell(cell)
            results.append(response)

        logger.info(f"Completed re-running {len(results)} cells")
        return results

    async def execute_code(self, code: str, cell_id: str) -> ExecuteCodeResponse:
        """Execute code in the kernel and return the results using nbclient."""
        async with self._lock:
            await self._ensure_kernel_ready()

            cell = self._get_or_create_cell(code, cell_id)

            return await self._execute_single_cell(cell)

    def is_kernel_ready(self) -> bool:
        """Check if the kernel is ready for execution."""
        return self._is_kernel_ready()

    def is_kernel_starting(self) -> bool:
        """Check if the kernel is currently starting."""
        return self.is_starting

    def _is_kernel_ready(self) -> bool:
        """Check if the kernel is ready for execution (internal method assuming lock is held)."""
        return self.is_ready and self.client is not None and not self.is_starting

    def get_kernel_id(self) -> str | None:
        """Get the current kernel ID."""
        return self.kernel_id

    async def get_notebook(self) -> NotebookNode:
        """Get the complete notebook data including all cells and their results."""
        async with self._lock:
            # Return the actual notebook with all cells and their outputs
            return self.nb


# Lifecycle Management Functions


async def initialize_kernel(kernel_manager: JupyterKernelManager):
    """Initialize the Jupyter kernel on startup."""
    logger.info("Initializing Jupyter kernel...")
    await kernel_manager.start_kernel()
    logger.info("Jupyter kernel initialized successfully")


async def cleanup_kernel(kernel_manager: JupyterKernelManager):
    """Cleanup Jupyter kernel resources on shutdown."""
    logger.info("Cleaning up Jupyter kernel...")
    if kernel_manager.client is not None and kernel_manager.client.km is not None:
        await asyncio.to_thread(kernel_manager.client.km.shutdown_kernel, now=True)
    logger.info("Jupyter kernel cleaned up successfully")
