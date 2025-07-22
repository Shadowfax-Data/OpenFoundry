import asyncio
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, AsyncGenerator, NamedTuple

from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError
from nbformat import NotebookNode, read
from nbformat.v4 import new_code_cell, new_notebook
from pydantic import BaseModel, Field

from openfoundry_sandbox.config import get_notebook_path

logger = logging.getLogger(__name__)

# Constants
INTERRUPT_TIMEOUT = 3.0  # seconds to wait for graceful interruption
KERNEL_START_TIMEOUT = 10.0  # seconds to wait for kernel start


class KernelStatus(str, Enum):
    """Enum for kernel status states."""

    INITIALIZING = "initializing"
    STARTING = "starting"
    READY = "ready"
    EXECUTING = "executing"
    INTERRUPTING = "interrupting"
    ERROR = "error"
    DEAD = "dead"


class CellWithIndex(NamedTuple):
    """Container for a notebook cell and its index in the notebook."""

    cell: NotebookNode
    index: int


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
        self._status: KernelStatus = KernelStatus.INITIALIZING
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
        if self._status in [KernelStatus.STARTING, KernelStatus.READY]:
            return self._status == KernelStatus.READY

        self._status = KernelStatus.STARTING

        try:
            logger.info("Starting Jupyter Python kernel...")

            self.client = NotebookClient(self.nb, kernel_name="python3")

            assert self.client is not None, "Kernel client is not initialized"

            # Create kernel manager first
            self.client.create_kernel_manager()

            # Now start the kernel with timeout
            start_task = asyncio.create_task(self.client.async_start_new_kernel())
            try:
                await asyncio.wait_for(start_task, timeout=KERNEL_START_TIMEOUT)
            except asyncio.TimeoutError:
                start_task.cancel()
                raise TimeoutError(
                    f"Kernel start timed out after {KERNEL_START_TIMEOUT} seconds"
                )

            # Create and start kernel client
            client_task = asyncio.create_task(
                self.client.async_start_new_kernel_client()
            )
            try:
                await asyncio.wait_for(client_task, timeout=KERNEL_START_TIMEOUT)
            except asyncio.TimeoutError:
                client_task.cancel()
                raise TimeoutError(
                    f"Kernel client start timed out after {KERNEL_START_TIMEOUT} seconds"
                )

            self.kernel_id = str(uuid.uuid4())
            self._status = KernelStatus.READY

            logger.info("Jupyter kernel started successfully")
            return True

        except Exception as e:
            error_msg = f"Failed to start kernel: {e}"
            logger.error(error_msg)

            self.client = None
            self._status = KernelStatus.ERROR

            # Clean up any partial state
            await self._cleanup_failed_start()

            raise e

    async def _cleanup_failed_start(self):
        """Clean up after a failed kernel start attempt."""
        try:
            if self.client and hasattr(self.client, "km") and self.client.km:
                logger.info("Cleaning up failed kernel start...")
                await asyncio.to_thread(self.client.km.shutdown_kernel, now=True)
        except Exception as cleanup_error:
            logger.warning(f"Error during cleanup of failed start: {cleanup_error}")

    async def restart_kernel(self):
        """
        Restart the kernel by shutting down the current one and starting a new one.

        Returns:
            bool: True if restart was successful, False otherwise
        """
        async with self._lock:
            logger.info("Restarting Jupyter kernel...")

            # First, try to interrupt any running execution
            if self._status == KernelStatus.EXECUTING:
                logger.info("Interrupting current execution before restart")
                # We can't call interrupt_kernel here as it would deadlock on the lock
                # So we do a quick shutdown instead

            # Shutdown existing kernel if it exists
            if self.client is not None and self.client.km is not None:
                logger.info("Shutting down kernel manager")
                await asyncio.to_thread(self.client.km.shutdown_kernel, now=True)

            # Reset state
            self.client = None
            self.kernel_id = None
            self._executing_cell_id = None
            self._execution_task = None
            self._status = KernelStatus.INITIALIZING

            # Start new kernel
            try:
                success = await self._start_kernel()
                if success:
                    logger.info("Kernel restarted successfully")
                    return True
                else:
                    logger.error("Failed to restart kernel")
                    return False
            except Exception as e:
                logger.error(f"Failed to restart kernel: {e}")
                self._status = KernelStatus.ERROR
                return False

    async def interrupt_kernel(self):
        """
        Interrupt the currently executing kernel using a layered approach.

        Layered approach:
        1. Try task cancellation (graceful)
        2. Try kernel interrupt signal

        This method is designed to work concurrently with execute_code_streaming
        without waiting for the execution lock to avoid deadlock.
        """
        # Quick status check - if not executing, nothing to interrupt
        if self._status != KernelStatus.EXECUTING or self._executing_cell_id is None:
            logger.info("No cell is currently executing")
            return False

        if self.client is None:
            logger.warning("Cannot interrupt kernel: client not initialized")
            return False

        # Store references for interruption
        current_task = self._execution_task
        self._status = KernelStatus.INTERRUPTING

        try:
            logger.info("Starting kernel interruption")

            # Layer 1: Try graceful task cancellation
            if current_task is not None and not current_task.done():
                logger.info("Layer 1: Attempting graceful task cancellation")
                current_task.cancel()

                try:
                    await asyncio.wait_for(current_task, timeout=INTERRUPT_TIMEOUT)
                    logger.info("Layer 1: Task completed/cancelled successfully")
                    self._status = KernelStatus.READY
                    return True
                except asyncio.CancelledError:
                    logger.info("Layer 1: Task cancelled successfully")
                    self._status = KernelStatus.READY
                    return True
                except asyncio.TimeoutError:
                    logger.info(
                        "Layer 1: Task cancellation timed out, proceeding to layer 2"
                    )

            # Layer 2: Try kernel interrupt signal
            logger.info("Layer 2: Sending interrupt signal to kernel")

            assert self.client.km is not None, "Kernel manager is not initialized"
            interrupt_task = asyncio.create_task(self.client.km.interrupt_kernel())

            try:
                await asyncio.wait_for(interrupt_task, timeout=INTERRUPT_TIMEOUT)
                logger.info("Layer 2: Kernel interrupt successful")
                self._status = KernelStatus.READY
                return True
            except asyncio.TimeoutError:
                logger.warning("Layer 2: Kernel interrupt timed out")
                interrupt_task.cancel()
                self._status = KernelStatus.ERROR
                return False
            except Exception as e:
                logger.warning(f"Layer 2: Kernel interrupt failed: {e}")
                self._status = KernelStatus.ERROR
                return False

        except Exception as e:
            logger.error(f"Critical error during kernel interruption: {e}")
            self._status = KernelStatus.ERROR
            return False

    async def rerun_notebook(self) -> AsyncGenerator[ExecutionStreamEvent, None]:
        """Re-run all cells in the notebook in order and stream their execution results."""
        logger.info(f"Re-running all {len(self.nb.cells)} cells in notebook")

        code_cells = [cell for cell in self.nb.cells if cell.cell_type == "code"]

        for i, cell in enumerate(code_cells):
            logger.info(f"Re-running cell {i+1}/{len(code_cells)} (ID: {cell.id})")

            # Execute each cell using the existing streaming method
            async for event in self.execute_code_streaming(cell.source, cell.id):
                # Enhance events with rerun-specific metadata
                event.data["cell_index"] = i
                event.data["total_cells"] = len(code_cells)
                yield event

        logger.info(f"Completed re-running {len(code_cells)} cells")

    async def execute_code_streaming(
        self, code: str, cell_id: str
    ) -> AsyncGenerator[ExecutionStreamEvent, None]:
        """Execute code in the kernel and stream outputs in real-time."""
        # Quick lock for status check and state setup
        async with self._lock:
            if self._status != KernelStatus.READY:
                raise KernelNotReadyError(
                    f"Kernel is not ready for execution. Status: {self._status}"
                )

            cell_with_index = self._get_or_create_cell(code, cell_id)
            cell = cell_with_index.cell
            cell_index = cell_with_index.index

            # Track the currently executing cell and update status
            self._executing_cell_id = cell_id
            self._status = KernelStatus.EXECUTING

        # The rest of execution happens without the lock
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
            try:
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

                # Task is now done - await it to get result or raise any exception
                await execution_task

            except asyncio.CancelledError:
                execution_task.cancel()
                raise
            finally:
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

                # Determine execution status and collect outputs
                outputs = list(cell.outputs)
                error_messages = [
                    f"{output.get('ename', 'Error')}: {output.get('evalue', 'Unknown error')}"
                    for output in outputs
                    if output.get("output_type") == "error"
                ]
                error_msg = "; ".join(error_messages) if error_messages else None
                status = "error" if error_msg else "completed"

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

        except CellExecutionError as e:
            # This is a normal cell execution error (ModuleNotFoundError, SyntaxError, etc.)
            # The error details are already captured in the cell outputs by nbclient
            logger.info(
                f"Cell execution failed with user code error (ID: {cell_id}): {e}"
            )
            # Let the finally block handle this as a normal completion with error outputs

        except Exception as e:
            # This is a system fault (kernel crash, communication error, etc.)
            completed_at = datetime.now(timezone.utc).isoformat()
            error_msg = str(e)

            logger.error(f"System error during cell execution (ID: {cell_id}): {e}")

            # Transition kernel to ERROR state - it's no longer reliable
            async with self._lock:
                self._status = KernelStatus.ERROR

            yield ExecutionStreamEvent(
                event_type="error",
                cell_id=cell_id,
                timestamp=completed_at,
                data={
                    "status": "error",
                    "error": error_msg,
                    "execution_count": getattr(cell, "execution_count", 0) or 0,
                    "started_at": started_at,
                    "completed_at": completed_at,
                },
            )

        finally:
            # Quick lock for cleanup - only clear if we're still the executing cell
            async with self._lock:
                if self._executing_cell_id == cell_id:
                    self._executing_cell_id = None
                self._execution_task = None
                # Only transition back to READY from EXECUTING state
                # If we're in ERROR state due to a system error, stay in ERROR
                if self._status == KernelStatus.EXECUTING:
                    self._status = KernelStatus.READY

    def is_kernel_ready(self) -> bool:
        """Check if the kernel is ready for execution."""
        return self._is_kernel_ready()

    def is_kernel_starting(self) -> bool:
        """Check if the kernel is currently starting."""
        return self._status == KernelStatus.STARTING

    def get_kernel_status(self) -> KernelStatus:
        """Get the current kernel status."""
        return self._status

    def _is_kernel_ready(self) -> bool:
        """Check if the kernel is ready for execution (internal method assuming lock is held)."""
        return self._status == KernelStatus.READY and self.client is not None

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
