import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, NamedTuple

from nbclient import NotebookClient
from nbformat import NotebookNode, read
from nbformat.v4 import new_code_cell, new_notebook
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class CellWithIndex(NamedTuple):
    """Container for a notebook cell and its index in the notebook."""

    cell: NotebookNode
    index: int


def get_notebook_path() -> str | None:
    """Get the notebook file path from environment variable."""
    initialization_data_str = os.environ.get("INITIALIZATION_DATA")
    if not initialization_data_str:
        return None

    import json

    initialization_data = json.loads(initialization_data_str)
    return initialization_data.get("notebook_path")


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


class ExecutionStreamEvent(BaseModel):
    """Model for streaming execution events."""

    event_type: str = Field(
        ..., description="Type of event: started, output, completed, error, interrupted"
    )
    cell_id: str = Field(..., description="Cell ID being executed")
    timestamp: str = Field(..., description="ISO timestamp of the event")
    data: dict[str, Any] = Field(
        default_factory=dict, description="Event-specific data"
    )


class KernelNotReadyError(Exception):
    """Exception raised when the kernel is not ready for execution."""

    def __init__(self, message: str = "Kernel is not ready for execution"):
        super().__init__(message)


class JupyterKernelManager:
    """Manages a persistent Jupyter kernel for code execution using nbclient."""

    def __init__(self):
        self.client: NotebookClient | None = None
        self.nb = self._load_or_create_notebook()
        self.kernel_id: str | None = None
        self.is_starting = False
        self.is_ready = False
        self._lock = asyncio.Lock()
        self._executing_cell_id: str | None = None
        self._execution_task: asyncio.Task | None = None

    def _load_or_create_notebook(self) -> NotebookNode:
        """Load existing notebook from file or create a new one if not found."""
        notebook_path = get_notebook_path()

        # Try to load existing notebook file
        if notebook_path and Path(notebook_path).exists():
            try:
                logger.info(f"Loading existing notebook from: {notebook_path}")
                with open(notebook_path, "r") as f:
                    notebook = read(f, as_version=4)
                logger.info(
                    f"Successfully loaded notebook with {len(notebook.cells)} cells"
                )
                return notebook
            except Exception as e:
                logger.error(f"Failed to load notebook from {notebook_path}: {e}")
                logger.info("Falling back to creating new notebook")
        else:
            if notebook_path:
                logger.info(
                    f"Notebook file not found at {notebook_path}, creating new notebook"
                )
            else:
                logger.info(
                    "No notebook_path found in environment, creating new notebook"
                )

        # Fall back to creating new notebook
        return new_notebook()

    def _get_or_create_cell(self, code: str, cell_id: str) -> CellWithIndex:
        """
        Get or create a cell for execution.

        Args:
            code: The code to be executed
            cell_id: Cell ID. If it matches an existing cell, updates that cell's code.
                    If it doesn't match, creates a new cell with this ID.

        Returns:
            CellWithIndex containing the cell node and its index in the notebook
        """
        # Check if cell with provided ID already exists
        for i, cell in enumerate(self.nb.cells):
            if cell.id == cell_id:
                # Cell already exists, update its code and return
                cell.source = code
                return CellWithIndex(cell=cell, index=i)

        # Cell doesn't exist, create new cell with the provided ID
        cell = new_code_cell(source=code)
        cell.id = cell_id  # Set the specific ID
        self.nb.cells.append(cell)
        # Return the cell with its index (it's now the last cell)
        return CellWithIndex(cell=cell, index=len(self.nb.cells) - 1)

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
        self.nb = (
            self._load_or_create_notebook()
        )  # Load notebook again instead of creating new
        self.kernel_id = None
        self.is_ready = False

        # Start new kernel
        await self._start_kernel()

    async def interrupt_kernel(self, cell_id: str | None = None):
        """
        Interrupt the kernel execution.

        This method is designed to work concurrently with execute_code_streaming
        without waiting for the execution lock to avoid deadlock.
        """
        # Check kernel readiness without lock - this is safe to read
        if not self.is_ready or self.client is None:
            logger.warning("Cannot interrupt kernel: kernel is not ready")
            return False

        # Check execution state - reading these is atomic
        current_executing_cell = self._executing_cell_id
        current_task = self._execution_task

        if current_executing_cell is None:
            logger.info("No cell is currently executing")
            return False

        # If a specific cell_id is provided, only interrupt if it matches
        if cell_id is not None and cell_id != current_executing_cell:
            logger.warning(
                f"Cannot interrupt cell {cell_id}: not currently executing (currently executing: {current_executing_cell})"
            )
            return False

        try:
            logger.info(
                f"Interrupting kernel execution for cell: {current_executing_cell}"
            )

            assert self.client.km is not None, "Kernel manager is not initialized"
            await self.client.km.async_interrupt_kernel()

            if current_task is not None and not current_task.done():
                current_task.cancel()
                logger.info(
                    f"Cancelled execution task for cell: {current_executing_cell}"
                )

            logger.info(
                f"Successfully interrupted execution for cell: {current_executing_cell}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to interrupt kernel: {e}")
            return False

    async def _execute_single_cell(
        self, cell: NotebookNode, cell_index: int
    ) -> ExecuteCodeResponse:
        """
        Execute a single cell and return the execution response.

        Args:
            cell: The notebook cell to execute
            cell_index: The index of the cell in the notebook

        Returns:
            ExecuteCodeResponse with execution results
        """
        started_at = datetime.now(timezone.utc).isoformat()

        try:
            assert self.client is not None, "Kernel client is not initialized"

            # Execute the cell using the notebook client
            await self.client.async_execute_cell(cell, cell_index=cell_index)

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
            response = await self._execute_single_cell(cell, i)
            results.append(response)

        logger.info(f"Completed re-running {len(results)} cells")
        return results

    async def execute_code(self, code: str, cell_id: str) -> ExecuteCodeResponse:
        """Execute code in the kernel and return the results using nbclient."""
        async with self._lock:
            await self._ensure_kernel_ready()

            cell_with_index = self._get_or_create_cell(code, cell_id)

            return await self._execute_single_cell(
                cell_with_index.cell, cell_with_index.index
            )

    async def execute_code_streaming(
        self, code: str, cell_id: str
    ) -> AsyncGenerator[ExecutionStreamEvent, None]:
        """Execute code in the kernel and stream outputs in real-time."""
        async with self._lock:
            await self._ensure_kernel_ready()

            cell_with_index = self._get_or_create_cell(code, cell_id)
            cell = cell_with_index.cell
            cell_index = cell_with_index.index

            started_at = datetime.now(timezone.utc).isoformat()

            # Emit start event
            yield ExecutionStreamEvent(
                event_type="started",
                cell_id=cell_id,
                timestamp=started_at,
                data={
                    "code": code,
                    "execution_count": getattr(cell, "execution_count", 0) or 0,
                },
            )

            # Track the currently executing cell
            self._executing_cell_id = cell_id

            try:
                assert self.client is not None, "Kernel client is not initialized"

                # Clear previous outputs
                cell.outputs = []

                # Create a task to execute the cell
                execution_task = asyncio.create_task(
                    self.client.async_execute_cell(cell, cell_index=cell_index)
                )

                # Store the task for potential interruption
                self._execution_task = execution_task

                # Monitor outputs while execution is running
                last_output_count = 0
                while not execution_task.done():
                    await asyncio.sleep(0.1)  # Poll every 100ms

                    # Check for new outputs
                    current_outputs = list(cell.outputs)
                    if len(current_outputs) > last_output_count:
                        # Stream new outputs
                        for i in range(last_output_count, len(current_outputs)):
                            output = current_outputs[i]
                            yield ExecutionStreamEvent(
                                event_type="output",
                                cell_id=cell_id,
                                timestamp=datetime.now(timezone.utc).isoformat(),
                                data={
                                    "output": dict(output),
                                    "output_index": i,
                                },
                            )
                        last_output_count = len(current_outputs)

                # Wait for execution to complete
                await execution_task

                # Stream any final outputs that might have been missed
                final_outputs = list(cell.outputs)
                if len(final_outputs) > last_output_count:
                    for i in range(last_output_count, len(final_outputs)):
                        output = final_outputs[i]
                        yield ExecutionStreamEvent(
                            event_type="output",
                            cell_id=cell_id,
                            timestamp=datetime.now(timezone.utc).isoformat(),
                            data={
                                "output": dict(output),
                                "output_index": i,
                            },
                        )

                completed_at = datetime.now(timezone.utc).isoformat()

                # Determine final status
                outputs = list(cell.outputs)
                error_outputs = [
                    output for output in outputs if output.get("output_type") == "error"
                ]
                status = "error" if error_outputs else "completed"
                error_msg = None

                if error_outputs:
                    error_messages = [
                        f"{output.get('ename', 'Error')}: {output.get('evalue', 'Unknown error')}"
                        for output in error_outputs
                    ]
                    error_msg = "; ".join(error_messages)

                # Emit completion event
                yield ExecutionStreamEvent(
                    event_type="completed",
                    cell_id=cell_id,
                    timestamp=completed_at,
                    data={
                        "status": status,
                        "error": error_msg,
                        "execution_count": cell.execution_count or 0,
                        "outputs": outputs,
                        "started_at": started_at,
                        "completed_at": completed_at,
                    },
                )

            except asyncio.CancelledError:
                completed_at = datetime.now(timezone.utc).isoformat()
                logger.info(f"Cell execution interrupted (ID: {cell_id})")

                yield ExecutionStreamEvent(
                    event_type="interrupted",
                    cell_id=cell_id,
                    timestamp=completed_at,
                    data={
                        "status": "interrupted",
                        "error": "Execution was interrupted by user",
                        "execution_count": getattr(cell, "execution_count", 0) or 0,
                        "started_at": started_at,
                        "completed_at": completed_at,
                    },
                )

            except Exception as e:
                completed_at = datetime.now(timezone.utc).isoformat()
                logger.error(f"Error executing cell (ID: {cell_id}): {e}")

                yield ExecutionStreamEvent(
                    event_type="error",
                    cell_id=cell_id,
                    timestamp=completed_at,
                    data={
                        "status": "error",
                        "error": str(e),
                        "execution_count": getattr(cell, "execution_count", 0) or 0,
                        "started_at": started_at,
                        "completed_at": completed_at,
                    },
                )

            finally:
                # Clear execution tracking
                self._executing_cell_id = None
                self._execution_task = None

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

    def delete_cell(self, cell_id: str) -> bool:
        """
        Delete a cell from the notebook by its ID.

        Args:
            cell_id: The ID of the cell to delete

        Returns:
            bool: True if cell was found and deleted, False if cell ID not found
        """
        for i, cell in enumerate(self.nb.cells):
            if cell.id == cell_id:
                del self.nb.cells[i]
                logger.info(f"Deleted cell with ID: {cell_id}")
                return True

        logger.warning(f"Cell with ID {cell_id} not found for deletion")
        return False


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
