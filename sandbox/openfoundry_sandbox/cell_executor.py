import asyncio
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, AsyncGenerator, NamedTuple
from dataclasses import dataclass

from nbclient import NotebookClient
from nbclient.exceptions import CellExecutionError
from nbformat import NotebookNode, read
from nbformat.v4 import new_code_cell, new_notebook
from pydantic import BaseModel, Field

from openfoundry_sandbox.config import get_notebook_path

logger = logging.getLogger(__name__)

# Constants
KERNEL_START_TIMEOUT = 10.0  # seconds to wait for kernel start


class KernelStatus(str, Enum):
    """Simplified kernel status states."""
    STARTING = "starting"
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
    event_type: str = Field(..., description="Type of event: started, output, completed, error")
    cell_id: str = Field(..., description="Cell ID being executed")
    timestamp: str = Field(..., description="ISO timestamp of the event")
    data: dict[str, Any] = Field(default_factory=dict, description="Event-specific data")


class CellExecutor:
    """Simplified notebook cell execution and kernel management."""

    def __init__(self):
        self.client: NotebookClient | None = None
        self.kernel_id: str | None = None
        self._status: KernelStatus = KernelStatus.STARTING
        self._execution_lock = asyncio.Lock()
        self.nb = self._load_or_create_notebook()
        self._executing_cell_id: str | None = None

    def _load_or_create_notebook(self) -> NotebookNode:
        """Load existing notebook from file or create a new one if not found."""
        notebook_path = get_notebook_path()

        if notebook_path and Path(notebook_path).exists():
            try:
                logger.info(f"Loading existing notebook from: {notebook_path}")
                with open(notebook_path, "r") as f:
                    notebook = read(f, as_version=4)
                logger.info(f"Successfully loaded notebook with {len(notebook.cells)} cells")
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
            await asyncio.wait_for(
                self.client.async_start_new_kernel(),
                timeout=KERNEL_START_TIMEOUT
            )
            await asyncio.wait_for(
                self.client.async_start_new_kernel_client(),
                timeout=KERNEL_START_TIMEOUT
            )

            self.kernel_id = str(uuid.uuid4())
            self._status = KernelStatus.READY
            logger.info("Jupyter kernel started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start kernel: {e}")
            self.client = None
            self._status = KernelStatus.ERROR
            raise

    async def restart_kernel(self) -> bool:
        """Restart the kernel."""
        logger.info("Restarting Jupyter kernel...")
        
        # Shutdown existing kernel
        if self.client and self.client.km:
            await self.client.km.shutdown_kernel(now=True)

        # Reset state
        self.client = None
        self.kernel_id = None
        self._executing_cell_id = None
        self._status = KernelStatus.STARTING

        # Start new kernel
        try:
            success = await self.start_kernel()
            if success:
                logger.info("Kernel restarted successfully")
            return success
        except Exception as e:
            logger.error(f"Failed to restart kernel: {e}")
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
        
        if not self.is_kernel_ready():
            raise KernelNotReadyError(f"Kernel is not ready. Status: {self._status}")

        async with self._execution_lock:
            self._executing_cell_id = cell_id
            self._status = KernelStatus.EXECUTING
            
            try:
                async for event in self._execute_cell_with_streaming(code, cell_id):
                    yield event
            finally:
                self._executing_cell_id = None
                self._status = KernelStatus.READY

    async def _execute_cell_with_streaming(
        self, code: str, cell_id: str
    ) -> AsyncGenerator[ExecutionEvent, None]:
        """Execute the cell and stream its outputs."""
        assert self.client is not None, "Kernel client is not initialized"
        
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
            data={"code": code}
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
                        data={"output": dict(output), "output_index": i}
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
                    data={"output": dict(output), "output_index": i}
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
                    "error": "; ".join(error_messages) if error_messages else None,
                    "execution_count": cell.execution_count or 0,
                    "outputs": list(final_outputs),
                    "started_at": started_at,
                    "completed_at": completed_at,
                }
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
                }
            )

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
        if self._status != KernelStatus.EXECUTING or not self.client or not self.client.km:
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

    def delete_cell(self, cell_id: str) -> bool:
        """Delete a cell from the notebook by its ID."""
        for i, cell in enumerate(self.nb.cells):
            if cell.id == cell_id:
                del self.nb.cells[i]
                logger.info(f"Deleted cell with ID: {cell_id}")
                return True

        logger.warning(f"Cell with ID {cell_id} not found for deletion")
        return False


 