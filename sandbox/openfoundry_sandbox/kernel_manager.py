import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from nbclient import NotebookClient
from nbformat import NotebookNode
from nbformat.v4 import new_code_cell, new_notebook
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class OutputModel(BaseModel):
    """Model for a single output from code execution."""

    output_type: str = Field(
        ..., description="Type of output (stream, execute_result, display_data, error)"
    )
    name: str | None = Field(None, description="Stream name for stream outputs")
    text: str | None = Field(None, description="Text content for stream outputs")
    data: dict[str, Any] | None = Field(
        None, description="Data content for display outputs"
    )
    metadata: dict[str, Any] | None = Field(None, description="Metadata for outputs")
    execution_count: int | None = Field(
        None, description="Execution count for execute_result"
    )
    ename: str | None = Field(None, description="Exception name for error outputs")
    evalue: str | None = Field(None, description="Exception value for error outputs")
    traceback: list[str] | None = Field(
        None, description="Exception traceback for error outputs"
    )


class ExecuteCodeResponse(BaseModel):
    """Response model for code execution."""

    cell_id: str = Field(..., description="Unique identifier for this execution")
    code: str = Field(..., description="The executed code")
    execution_count: int = Field(
        ...,
        description="Execution count for this cell execution (increments for each cell execution in the session)",
    )
    outputs: list[OutputModel] = Field(
        default_factory=list, description="List of outputs from execution"
    )
    status: str = Field(..., description="Execution status (completed, error)")
    error: str | None = Field(None, description="Error message if execution failed")
    started_at: str = Field(..., description="ISO timestamp when execution started")
    completed_at: str = Field(..., description="ISO timestamp when execution completed")


# Custom exceptions
class CellIdNotFoundError(Exception):
    """Exception raised when a cell with the specified ID does not exist in the notebook."""

    def __init__(self, cell_id: str):
        super().__init__(f"Cell with ID '{cell_id}' does not exist in the notebook.")
        self.cell_id = cell_id


class JupyterKernelManager:
    """Manages a persistent Jupyter kernel for code execution using nbclient."""

    def __init__(self):
        self.client: NotebookClient | None = None
        self.nb = new_notebook()
        self.kernel_id: str | None = None
        self.is_starting = False
        self.is_ready = False
        self._lock = asyncio.Lock()

    def _get_or_create_cell(
        self, code: str, cell_id: str | None = None
    ) -> NotebookNode:
        """
        Get or create a cell for execution.

        Args:
            code: The code to be executed
            cell_id: Optional cell ID. If provided and exists, reuses that cell.
                    If provided but doesn't exist, creates new cell with that ID.
                    If None, creates new cell with auto-generated ID.

        Returns:
            The cell node
        """
        # If no cell_id provided, create new cell with auto-generated ID
        if cell_id is None:
            cell = new_code_cell(source=code)
            self.nb.cells.append(cell)
            return cell

        # Check if cell with provided ID already exists
        for cell in self.nb.cells:
            if cell.id == cell_id:
                # Cell already exists, update and return existing cell
                cell.source = code
                return cell

        raise CellIdNotFoundError(cell_id)

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

    async def execute_code(
        self, code: str, cell_id: str | None = None
    ) -> ExecuteCodeResponse:
        """Execute code in the kernel and return the results using nbclient."""
        async with self._lock:
            return await self._execute_code(code, cell_id)

    async def _execute_code(
        self, code: str, cell_id: str | None = None
    ) -> ExecuteCodeResponse:
        """Internal implementation of execute_code with lock protection."""
        if not self._is_kernel_ready():
            if not self.is_starting:
                await self._start_kernel()
            if not self._is_kernel_ready():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Kernel is not ready for execution",
                )

        started_at = datetime.now(timezone.utc).isoformat()

        try:
            assert self.client is not None, "Kernel client is not initialized"

            # Get or create the cell for execution
            cell = self._get_or_create_cell(code, cell_id)
            final_cell_id = cell.id

            # Execute the cell using the notebook client
            await self.client.async_execute_cell(cell, cell_index=0)

            # Parse outputs from the executed cell
            outputs = []
            status_result = "completed"
            error_msg = None

            for output in cell.outputs:
                if output.output_type == "stream":
                    outputs.append(
                        OutputModel(
                            output_type="stream",
                            name=output.name,
                            text=output.text,
                            data=None,
                            metadata=None,
                            execution_count=None,
                            ename=None,
                            evalue=None,
                            traceback=None,
                        )
                    )
                elif output.output_type == "execute_result":
                    outputs.append(
                        OutputModel(
                            output_type="execute_result",
                            data=output.data,
                            metadata=getattr(output, "metadata", {}),
                            execution_count=output.execution_count,
                            name=None,
                            text=None,
                            ename=None,
                            evalue=None,
                            traceback=None,
                        )
                    )
                elif output.output_type == "display_data":
                    outputs.append(
                        OutputModel(
                            output_type="display_data",
                            data=output.data,
                            metadata=getattr(output, "metadata", {}),
                            name=None,
                            text=None,
                            execution_count=None,
                            ename=None,
                            evalue=None,
                            traceback=None,
                        )
                    )
                elif output.output_type == "error":
                    outputs.append(
                        OutputModel(
                            output_type="error",
                            ename=output.ename,
                            evalue=output.evalue,
                            traceback=output.traceback,
                            name=None,
                            text=None,
                            data=None,
                            metadata=None,
                            execution_count=None,
                        )
                    )
                    error_msg = f"{output.ename}: {output.evalue}"

            completed_at = datetime.now(timezone.utc).isoformat()

            # Create response
            response = ExecuteCodeResponse(
                cell_id=final_cell_id,
                code=code,
                execution_count=cell.execution_count,
                outputs=outputs,
                status=status_result,
                error=error_msg,
                started_at=started_at,
                completed_at=completed_at,
            )

            return response

        except CellIdNotFoundError:
            logger.error(f"Cell with ID '{cell_id}' does not exist in the notebook.")

            # HTTP exception will be raised by the api endpoint
            raise
        except Exception as e:
            completed_at = datetime.now(timezone.utc).isoformat()
            logger.error(f"Error executing code: {e}")

            response = ExecuteCodeResponse(
                cell_id=final_cell_id,
                code=code,
                execution_count=cell.execution_count,  # Fallback for error cases
                outputs=[],
                status="error",
                error=str(e),
                started_at=started_at,
                completed_at=completed_at,
            )

            return response

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
