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
from notebook_types import TailCellsResult
from pydantic import BaseModel, Field

from openfoundry_sandbox.config import get_notebook_path, get_workspace_path

logger = logging.getLogger(__name__)

# Constants
KERNEL_START_TIMEOUT = 10.0  # seconds to wait for kernel start


class KernelStatus(str, Enum):
    """Simplified kernel status states."""

    STARTING = "starting"
    INITIALIZING = "initializing"
    READY = "ready"
    EXECUTING = "executing"
    ERROR = "error"


class KernelNotReadyError(Exception):
    """Exception raised when the kernel is not ready for execution."""

    pass


class CellWithIndex(NamedTuple):
    """Container for a notebook cell and its index in the notebook."""

    cell: NotebookNode
    index: int


class ExecutionEvent(BaseModel):
    """Simplified model for execution events."""

    event_type: str = Field(
        ..., description="Type of event: started, output, completed, error"
    )
    cell_id: str = Field(..., description="Cell ID being executed")
    timestamp: str = Field(..., description="ISO timestamp of the event")
    data: dict[str, Any] = Field(
        default_factory=dict, description="Event-specific data"
    )


class ExecutionRequest(NamedTuple):
    """Container for a queued execution request."""

    code: str
    cell_id: str
    result_queue: asyncio.Queue


class CellExecutor:
    """Simplified notebook cell execution and kernel management."""

    def __init__(self):
        self.client: NotebookClient | None = None
        self.kernel_id: str | None = None
        self._status: KernelStatus = KernelStatus.STARTING
        self._execution_lock = asyncio.Lock()
        self.nb = self._load_or_create_notebook()
        self._executing_cell_id: str | None = None
        self._execution_queue: asyncio.Queue = asyncio.Queue()
        self._queue_processor_task: asyncio.Task | None = None

    def _load_or_create_notebook(self) -> NotebookNode:
        """Load existing notebook from file or create a new one if not found."""
        notebook_path = get_notebook_path()

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

        logger.info("Creating new notebook")
        return new_notebook()

    async def start_kernel(self) -> bool:
        """Start the Jupyter kernel."""
        if self._status == KernelStatus.READY:
            return True

        self._status = KernelStatus.STARTING

        try:
            logger.info("Starting Jupyter Python kernel...")
            self.client = NotebookClient(self.nb, kernel_name="python3")

            # Create kernel manager and start kernel
            self.client.create_kernel_manager()
            workspace_path = get_workspace_path()
            await asyncio.wait_for(
                self.client.async_start_new_kernel(cwd=workspace_path),
                timeout=KERNEL_START_TIMEOUT,
            )
            await asyncio.wait_for(
                self.client.async_start_new_kernel_client(),
                timeout=KERNEL_START_TIMEOUT,
            )

            self.kernel_id = str(uuid.uuid4())
            self._status = KernelStatus.INITIALIZING

            # Start the queue processor
            if self._queue_processor_task is None or self._queue_processor_task.done():
                self._queue_processor_task = asyncio.create_task(
                    self._process_execution_queue()
                )

            logger.info("Jupyter kernel started successfully, now initializing...")
            return True

        except Exception as e:
            logger.error(f"Failed to start kernel: {e}")
            self.client = None
            self._status = KernelStatus.ERROR
            raise

    def complete_initialization(self):
        """Mark the kernel as fully ready after initialization is complete."""
        if self._status == KernelStatus.INITIALIZING:
            self._status = KernelStatus.READY
            logger.info("Kernel initialization completed - kernel is now ready")
        else:
            logger.warning(
                f"Attempted to complete initialization from status: {self._status}"
            )

    async def _process_execution_queue(self):
        """Process queued execution requests sequentially."""
        logger.info("Started execution queue processor")

        current_request = None
        try:
            while True:
                # Wait for an execution request
                current_request = await self._execution_queue.get()

                try:
                    # Execute the cell and stream results to the request's result queue
                    async for event in self._execute_cell_with_streaming_internal(
                        current_request.code, current_request.cell_id
                    ):
                        await current_request.result_queue.put(event)

                    # Signal completion
                    await current_request.result_queue.put(None)

                except Exception as e:
                    # Send error event to result queue
                    error_event = ExecutionEvent(
                        event_type="error",
                        cell_id=current_request.cell_id,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        data={"error": str(e)},
                    )
                    await current_request.result_queue.put(error_event)
                    await current_request.result_queue.put(None)

                finally:
                    # Mark task as done
                    self._execution_queue.task_done()
                    current_request = None

        except asyncio.CancelledError:
            logger.info("Execution queue processor cancelled")

            # If we were processing a request when cancelled, notify it
            if current_request:
                try:
                    error_event = ExecutionEvent(
                        event_type="error",
                        cell_id=current_request.cell_id,
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        data={
                            "error": "Execution cancelled - kernel shutting down",
                            "status": "cancelled",
                        },
                    )
                    await current_request.result_queue.put(error_event)
                    await current_request.result_queue.put(None)
                    self._execution_queue.task_done()
                except Exception as e:
                    logger.error(f"Failed to notify cancelled request: {e}")

            raise

    async def _clear_execution_queue(self):
        """Clear the execution queue and notify pending requests."""
        logger.info("Clearing execution queue")

        cleared_count = 0
        while not self._execution_queue.empty():
            try:
                request = self._execution_queue.get_nowait()

                # Send error event to the pending request
                error_event = ExecutionEvent(
                    event_type="error",
                    cell_id=request.cell_id,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    data={
                        "error": "Execution cancelled - kernel shutting down",
                        "status": "cancelled",
                    },
                )
                await request.result_queue.put(error_event)

                # Send completion signal
                await request.result_queue.put(None)

                # Mark task as done
                self._execution_queue.task_done()
                cleared_count += 1

            except asyncio.QueueEmpty:
                break

        if cleared_count > 0:
            logger.info(
                f"Notified {cleared_count} pending execution requests about kernel shutting down"
            )

    async def shutdown_kernel(self) -> bool:
        """Shutdown the kernel and clean up resources."""
        logger.info("Shutting down Jupyter kernel...")

        try:
            # Cancel the queue processor
            if self._queue_processor_task and not self._queue_processor_task.done():
                self._queue_processor_task.cancel()
                try:
                    await self._queue_processor_task
                except asyncio.CancelledError:
                    pass

            # Clear the execution queue and notify pending requests
            await self._clear_execution_queue()

            # Shutdown the kernel
            if self.client and self.client.km:
                await self.client.km.shutdown_kernel(now=True)
                logger.info("Kernel shutdown successfully")

            # Reset state
            self.client = None
            self.kernel_id = None
            self._executing_cell_id = None
            self._status = KernelStatus.STARTING
            self._queue_processor_task = None

            logger.info("Kernel cleanup completed")
            return True

        except Exception as e:
            logger.error(f"Failed to shutdown kernel: {e}")
            self._status = KernelStatus.ERROR
            return False

    def _get_or_create_cell(self, code: str, cell_id: str) -> CellWithIndex:
        """Get or create a cell for execution."""
        # Check if cell exists
        for i, cell in enumerate(self.nb.cells):
            if cell.id == cell_id:
                cell.source = code
                return CellWithIndex(cell=cell, index=i)

        # Create new cell
        cell = new_code_cell(source=code)
        cell.id = cell_id
        self.nb.cells.append(cell)
        return CellWithIndex(cell=cell, index=len(self.nb.cells) - 1)

    def _get_cell_by_id(self, cell_id: str) -> NotebookNode | None:
        """Get a cell by its ID."""
        for cell in self.nb.cells:
            if cell.id == cell_id:
                return cell
        return None

    async def execute_code_streaming(
        self, code: str, cell_id: str
    ) -> AsyncGenerator[ExecutionEvent, None]:
        """Execute code and stream outputs in real-time."""

        # Check if kernel exists (but don't require it to be ready - it might be executing another cell)
        if self.client is None:
            raise KernelNotReadyError(
                f"Kernel is not initialized. Status: {self._status}"
            )

        # Create a result queue for this execution
        result_queue = asyncio.Queue()

        # Queue the execution request
        request = ExecutionRequest(
            code=code, cell_id=cell_id, result_queue=result_queue
        )
        await self._execution_queue.put(request)

        # Stream results from the result queue
        while True:
            event = await result_queue.get()
            if event is None:  # Completion signal
                break
            yield event

    async def _execute_cell_with_streaming_internal(
        self, code: str, cell_id: str
    ) -> AsyncGenerator[ExecutionEvent, None]:
        """Execute the cell and stream its outputs."""
        assert self.client is not None, "Kernel client is not initialized"

        # Use execution lock and update status
        async with self._execution_lock:
            self._executing_cell_id = cell_id
            self._status = KernelStatus.EXECUTING

            try:
                # Prepare cell
                cell_with_index = self._get_or_create_cell(code, cell_id)
                cell = cell_with_index.cell
                cell_index = cell_with_index.index
                cell.outputs = []

                started_at = datetime.now(timezone.utc).isoformat()

                # Emit started event
                yield ExecutionEvent(
                    event_type="started",
                    cell_id=cell_id,
                    timestamp=started_at,
                    data={"code": code},
                )

                try:
                    # Create execution task
                    execution_task = asyncio.create_task(
                        self.client.async_execute_cell(cell, cell_index=cell_index)
                    )

                    # Stream outputs during execution
                    last_output_count = 0
                    while not execution_task.done():
                        await asyncio.sleep(0.1)

                        # Stream new outputs
                        current_outputs = list(cell.outputs)
                        for i in range(last_output_count, len(current_outputs)):
                            output = current_outputs[i]
                            yield ExecutionEvent(
                                event_type="output",
                                cell_id=cell_id,
                                timestamp=datetime.now(timezone.utc).isoformat(),
                                data={"output": dict(output), "output_index": i},
                            )
                        last_output_count = len(current_outputs)

                    # Wait for execution to complete
                    await execution_task

                    # Stream any final outputs
                    final_outputs = list(cell.outputs)
                    for i in range(last_output_count, len(final_outputs)):
                        output = final_outputs[i]
                        yield ExecutionEvent(
                            event_type="output",
                            cell_id=cell_id,
                            timestamp=datetime.now(timezone.utc).isoformat(),
                            data={"output": dict(output), "output_index": i},
                        )

                    # Emit completion event
                    completed_at = datetime.now(timezone.utc).isoformat()
                    error_messages = [
                        f"{output.get('ename', 'Error')}: {output.get('evalue', 'Unknown error')}"
                        for output in final_outputs
                        if output.get("output_type") == "error"
                    ]

                    yield ExecutionEvent(
                        event_type="completed",
                        cell_id=cell_id,
                        timestamp=completed_at,
                        data={
                            "status": "error" if error_messages else "success",
                            "error": "; ".join(error_messages)
                            if error_messages
                            else None,
                            "execution_count": cell.execution_count or 0,
                            "outputs": list(final_outputs),
                            "started_at": started_at,
                            "completed_at": completed_at,
                        },
                    )

                except CellExecutionError as e:
                    # Handle cell execution errors (like ModuleNotFoundError, SyntaxError, etc.)
                    # The error outputs should already be in the cell.outputs
                    logger.info(f"Cell execution error for cell {cell_id}: {e}")

                    # Stream any error outputs that were captured
                    final_outputs = list(cell.outputs)
                    for i, output in enumerate(final_outputs):
                        yield ExecutionEvent(
                            event_type="output",
                            cell_id=cell_id,
                            timestamp=datetime.now(timezone.utc).isoformat(),
                            data={"output": dict(output), "output_index": i},
                        )

                    # Emit completion event with error status
                    completed_at = datetime.now(timezone.utc).isoformat()
                    error_messages = [
                        f"{output.get('ename', 'Error')}: {output.get('evalue', 'Unknown error')}"
                        for output in final_outputs
                        if output.get("output_type") == "error"
                    ]

                    yield ExecutionEvent(
                        event_type="completed",
                        cell_id=cell_id,
                        timestamp=completed_at,
                        data={
                            "status": "error",
                            "error": "; ".join(error_messages)
                            if error_messages
                            else str(e),
                            "execution_count": cell.execution_count or 0,
                            "outputs": list(final_outputs),
                            "started_at": started_at,
                            "completed_at": completed_at,
                        },
                    )

                except Exception as e:
                    # Handle execution errors
                    completed_at = datetime.now(timezone.utc).isoformat()
                    yield ExecutionEvent(
                        event_type="error",
                        cell_id=cell_id,
                        timestamp=completed_at,
                        data={
                            "status": "error",
                            "error": str(e),
                            "started_at": started_at,
                            "completed_at": completed_at,
                        },
                    )
            finally:
                # Reset status when done
                self._executing_cell_id = None
                self._status = KernelStatus.READY

    async def rerun_notebook(self) -> AsyncGenerator[ExecutionEvent, None]:
        """Re-run all cells in the notebook in order."""
        logger.info(f"Re-running all {len(self.nb.cells)} cells in notebook")

        code_cells = [cell for cell in self.nb.cells if cell.cell_type == "code"]

        for i, cell in enumerate(code_cells):
            logger.info(f"Re-running cell {i+1}/{len(code_cells)} (ID: {cell.id})")

            async for event in self.execute_code_streaming(cell.source, cell.id):
                # Add rerun metadata
                event.data["cell_index"] = i
                event.data["total_cells"] = len(code_cells)
                yield event

        logger.info(f"Completed re-running {len(code_cells)} cells")

    async def interrupt_execution(self) -> bool:
        """Interrupt the currently executing cell."""
        if (
            self._status != KernelStatus.EXECUTING
            or not self.client
            or not self.client.km
        ):
            logger.info("No cell is currently executing")
            return False

        try:
            logger.info(f"Interrupting execution for cell {self._executing_cell_id}")
            await self.client.km._async_interrupt_kernel()
            logger.info("Kernel interrupt signal sent successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to interrupt kernel: {e}")
            return False

    # Status and utility methods
    def is_kernel_ready(self) -> bool:
        """Check if the kernel is ready for execution."""
        return self._status == KernelStatus.READY and self.client is not None

    def get_kernel_status(self) -> KernelStatus:
        """Get the current kernel status."""
        return self._status

    def get_kernel_id(self) -> str | None:
        """Get the current kernel ID."""
        return self.kernel_id

    def get_executing_cell_id(self) -> str | None:
        """Get the ID of the currently executing cell, if any."""
        return self._executing_cell_id

    async def get_notebook(self) -> NotebookNode:
        """Get the complete notebook data."""
        return self.nb

    async def tail_cells(self, num_cells: int = 5) -> TailCellsResult:
        """Get the last N cells from the notebook with their outputs.

        Args:
            num_cells: Number of cells to retrieve from the end of the notebook

        Returns:
            Dictionary containing optimized cell data for the last N cells
        """
        cells = self.nb.cells[-num_cells:] if num_cells > 0 else []

        formatted_cells = []
        total_cells = len(self.nb.cells)
        start_index = max(0, total_cells - num_cells)

        for i, cell in enumerate(cells):
            cell_info = {
                "cell_index": start_index + i,
                "cell_type": cell.get("cell_type", "unknown"),
                "source": cell.get("source", ""),
                "execution_count": cell.get("execution_count"),
            }

            # Optimize outputs if they exist
            if cell.get("outputs"):
                cell_info["outputs"] = self._optimize_cell_outputs(cell["outputs"])

            formatted_cells.append(cell_info)

        return TailCellsResult(
            total_cells=total_cells,
            returned_cells=len(formatted_cells),
            start_index=start_index,
            cells=formatted_cells,
        )

    def _optimize_cell_outputs(self, outputs: list) -> list:
        """Optimize cell outputs to reduce context window usage while preserving essential content."""
        optimized = []

        for output in outputs:
            output_type = output.get("output_type", "")

            if output_type == "stream":
                # Keep stream outputs (stdout/stderr) as-is since they're usually important
                optimized.append(
                    {
                        "output_type": "stream",
                        "name": output.get("name", "stdout"),
                        "text": output.get("text", ""),
                    }
                )

            elif output_type == "display_data":
                # Optimize display data, especially images
                data = output.get("data", {})
                optimized_output = {"output_type": "display_data"}

                # Handle images with optimization
                if "image/png" in data:
                    # Extract PNG image data
                    image_data = data["image/png"]
                    optimized_output["image"] = image_data
                    optimized_output["image_format"] = "png"

                    # Add description from text/plain if available
                    if "text/plain" in data:
                        text_desc = data["text/plain"]
                        # Extract meaningful description from matplotlib figure text
                        if "Figure size" in text_desc:
                            optimized_output["description"] = text_desc

                elif "image/jpeg" in data:
                    optimized_output["image"] = data["image/jpeg"]
                    optimized_output["image_format"] = "jpeg"
                    if "text/plain" in data:
                        optimized_output["description"] = data["text/plain"]

                # Keep other important data types
                for key in ["text/html", "application/json"]:
                    if key in data:
                        optimized_output[key.replace("/", "_")] = data[key]

                if len(optimized_output) > 1:  # More than just output_type
                    optimized.append(optimized_output)

            elif output_type == "execute_result":
                # Keep execute results but optimize similar to display_data
                data = output.get("data", {})
                optimized_output = {
                    "output_type": "execute_result",
                    "execution_count": output.get("execution_count"),
                }

                # Keep text/plain for simple results
                if "text/plain" in data:
                    optimized_output["text"] = data["text/plain"]

                # Handle images in execute results
                if "image/png" in data:
                    optimized_output["image"] = data["image/png"]
                    optimized_output["image_format"] = "png"
                elif "image/jpeg" in data:
                    optimized_output["image"] = data["image/jpeg"]
                    optimized_output["image_format"] = "jpeg"

                optimized.append(optimized_output)

            elif output_type == "error":
                # Keep error information as it's crucial for debugging
                optimized.append(
                    {
                        "output_type": "error",
                        "ename": output.get("ename", ""),
                        "evalue": output.get("evalue", ""),
                        "traceback": output.get("traceback", []),
                    }
                )

        return optimized

    def delete_cell(self, cell_id: str) -> bool:
        """Delete a cell from the notebook by its ID."""
        for i, cell in enumerate(self.nb.cells):
            if cell.id == cell_id:
                del self.nb.cells[i]
                logger.info(f"Deleted cell with ID: {cell_id}")
                return True

        logger.warning(f"Cell with ID {cell_id} not found for deletion")
        return False
