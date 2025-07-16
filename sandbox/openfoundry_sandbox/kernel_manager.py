import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from nbclient import NotebookClient
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
    execution_count: int = Field(..., description="Execution count from the kernel")
    outputs: list[OutputModel] = Field(
        default_factory=list, description="List of outputs from execution"
    )
    status: str = Field(..., description="Execution status (completed, error)")
    error: str | None = Field(None, description="Error message if execution failed")
    started_at: str = Field(..., description="ISO timestamp when execution started")
    completed_at: str = Field(..., description="ISO timestamp when execution completed")


class JupyterKernelManager:
    """Manages a persistent Jupyter kernel for code execution using nbclient."""

    def __init__(self):
        self.client: NotebookClient | None = None
        self.nb = new_notebook()
        self.execution_count = 0
        self.execution_results: dict[str, ExecuteCodeResponse] = {}
        self.kernel_id: str | None = None
        self.is_starting = False
        self.is_ready = False
        self._lock = asyncio.Lock()

    async def start_kernel(self):
        """Start the Jupyter kernel asynchronously."""
        async with self._lock:
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
                self.execution_count = 0
                self.is_ready = True

                logger.info("Jupyter kernel started successfully")
                return True

            except Exception as e:
                logger.error(f"Failed to start kernel: {e}")
                self.client = None
                self.is_ready = False
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to start kernel: {str(e)}",
                )
            finally:
                self.is_starting = False

    async def restart_kernel(self):
        """Restart the kernel, clearing all state."""
        async with self._lock:
            logger.info("Restarting kernel...")

            # Stop existing kernel
            if (
                self.client is not None
                and hasattr(self.client, "km")
                and self.client.km is not None
            ):
                try:
                    await asyncio.to_thread(self.client.km.shutdown_kernel, now=True)
                except Exception as e:
                    logger.warning(f"Error stopping kernel: {e}")

            # Clear state
            self.client = None
            self.nb = new_notebook()
            self.execution_count = 0
            self.kernel_id = None
            self.is_ready = False

            # Start new kernel
            await self.start_kernel()

    def is_kernel_ready(self) -> bool:
        """Check if the kernel is ready for execution."""
        return self.is_ready and self.client is not None and not self.is_starting

    def is_kernel_starting(self) -> bool:
        """Check if the kernel is currently starting."""
        return self.is_starting

    async def execute_code(
        self, code: str, cell_id: str | None = None
    ) -> ExecuteCodeResponse:
        """Execute code in the kernel and return the results using nbclient."""
        if not self.is_kernel_ready():
            if not self.is_kernel_starting():
                await self.start_kernel()
            if not self.is_kernel_ready():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Kernel is not ready for execution",
                )

        if cell_id is None:
            cell_id = str(uuid.uuid4())

        started_at = datetime.utcnow().isoformat()

        try:
            assert self.client is not None, "Kernel client is not initialized"

            # Create a new code cell
            cell = new_code_cell(source=code)

            # Add cell to notebook temporarily for execution
            temp_nb = new_notebook()
            temp_nb.cells = [cell]

            # Create a temporary client for this execution
            temp_client = NotebookClient(temp_nb, kernel_name="python3")

            # Use the existing kernel from our main client
            temp_client.km = self.client.km
            temp_client.kc = self.client.kc

            # Execute the cell
            await temp_client.async_execute_cell(
                cell, cell_index=0, execution_count=self.execution_count + 1
            )

            # Parse outputs from the executed cell
            outputs = []
            execution_count = None
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
                    execution_count = output.execution_count
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

            # Update execution count
            if execution_count is not None:
                self.execution_count = execution_count
            else:
                self.execution_count += 1
                execution_count = self.execution_count

            completed_at = datetime.utcnow().isoformat()

            # Create response
            response = ExecuteCodeResponse(
                cell_id=cell_id,
                code=code,
                execution_count=execution_count,
                outputs=outputs,
                status=status_result,
                error=error_msg,
                started_at=started_at,
                completed_at=completed_at,
            )

            # Store result
            self.execution_results[cell_id] = response

            return response

        except Exception as e:
            completed_at = datetime.utcnow().isoformat()
            logger.error(f"Error executing code: {e}")

            response = ExecuteCodeResponse(
                cell_id=cell_id,
                code=code,
                execution_count=self.execution_count,
                outputs=[],
                status="error",
                error=str(e),
                started_at=started_at,
                completed_at=completed_at,
            )

            self.execution_results[cell_id] = response
            return response

    def get_result(self, cell_id: str) -> ExecuteCodeResponse | None:
        """Get the result of a specific cell execution."""
        return self.execution_results.get(cell_id)

    def get_all_results(self) -> list[ExecuteCodeResponse]:
        """Get all execution results."""
        return list(self.execution_results.values())

    def clear_results(self):
        """Clear stored execution results (keep kernel running)."""
        self.execution_results.clear()


# Lifecycle Management Functions


async def initialize_kernel(kernel_manager: JupyterKernelManager):
    """Initialize the Jupyter kernel on startup."""
    try:
        logger.info("Initializing Jupyter kernel...")
        await kernel_manager.start_kernel()
        logger.info("Jupyter kernel initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Jupyter kernel: {e}")
        # Don't raise - let the server start and kernel can be started later


async def cleanup_kernel(kernel_manager: JupyterKernelManager):
    """Cleanup Jupyter kernel resources on shutdown."""
    try:
        logger.info("Cleaning up Jupyter kernel...")
        if (
            kernel_manager.client is not None
            and hasattr(kernel_manager.client, "km")
            and kernel_manager.client.km is not None
        ):
            await asyncio.to_thread(kernel_manager.client.km.shutdown_kernel, now=True)
        logger.info("Jupyter kernel cleaned up successfully")
    except Exception as e:
        logger.error(f"Error cleaning up Jupyter kernel: {e}")
