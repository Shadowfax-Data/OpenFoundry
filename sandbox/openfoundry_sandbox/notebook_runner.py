import logging
import uuid
from datetime import datetime
from typing import Any

import nbformat
from nbclient import NotebookClient

logger = logging.getLogger(__name__)


class NotebookCellExecutionResult:
    """Represents the result of executing a notebook cell."""

    def __init__(self, cell_id: str, code: str):
        self.cell_id = cell_id
        self.code = code
        self.execution_count: int | None = None
        self.outputs: list[dict[str, Any]] = []
        self.status: str = "pending"  # pending, running, completed, error
        self.error: str | None = None
        self.started_at: datetime = datetime.now()
        self.completed_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary for JSON serialization."""
        return {
            "cell_id": self.cell_id,
            "code": self.code,
            "execution_count": self.execution_count,
            "outputs": self.outputs,
            "status": self.status,
            "error": self.error,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat()
            if self.completed_at
            else None,
        }


class JupyterKernelManager:
    """Manages a Jupyter Python kernel for executing notebook cells."""

    def __init__(self):
        self.nb = nbformat.v4.new_notebook()
        self.client: NotebookClient | None = None
        self.is_starting = False
        self.is_ready = False
        self._execution_results: dict[str, NotebookCellExecutionResult] = {}

    async def start_kernel(self) -> bool:
        """Start the Jupyter kernel asynchronously."""
        if self.is_starting or self.is_ready:
            return self.is_ready

        self.is_starting = True
        try:
            logger.info("Starting Jupyter Python kernel...")

            self.client = NotebookClient(self.nb, kernel_name="python3")

            # Create kernel manager first
            self.client.create_kernel_manager()

            # Now start the kernel
            await self.client.async_start_new_kernel()

            # Create and start kernel client
            await self.client.async_start_new_kernel_client()

            self.is_ready = True
            logger.info("Jupyter kernel started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start Jupyter kernel: {e}", exc_info=True)
            self.is_ready = False
            return False
        finally:
            self.is_starting = False

    async def stop_kernel(self):
        """Stop the Jupyter kernel."""
        if self.client and hasattr(self.client, "km") and self.client.km:
            logger.info("Shutting down Jupyter kernel...")
            try:
                if hasattr(self.client, "kc") and self.client.kc:
                    self.client.kc.stop_channels()
                if hasattr(self.client, "km") and self.client.km:
                    self.client.km.shutdown_kernel()
            except Exception as e:
                logger.error(f"Error during client cleanup: {e}", exc_info=True)

        self.client = None
        self.is_ready = False
        logger.info("Jupyter kernel stopped")

    async def execute_cell(
        self, code: str, cell_id: str | None = None
    ) -> NotebookCellExecutionResult:
        """Execute a cell of code in the kernel."""
        if not self.is_ready or not self.client:
            raise RuntimeError("Kernel is not ready. Call start_kernel() first.")

        if not cell_id:
            cell_id = str(uuid.uuid4())

        result = NotebookCellExecutionResult(cell_id, code)
        self._execution_results[cell_id] = result

        cell = nbformat.v4.new_code_cell(source=code)

        try:
            result.status = "running"
            logger.info(f"Executing cell {cell_id}: {code}")

            # Add the cell to the notebook
            self.nb.cells.append(cell)
            cell_index = len(self.nb.cells) - 1

            # Execute the cell using the async method
            await self.client.async_execute_cell(cell, cell_index)

            logger.info(f"Cell execution completed. Outputs: {len(cell.outputs)}")
            result.outputs = cell.outputs
            result.execution_count = cell.execution_count

            # Check for errors in outputs
            for output in cell.outputs:
                if output.output_type == "error":
                    result.status = "error"
                    result.error = f"{output.ename}: {output.evalue}"
                    logger.error(f"Cell execution error: {result.error}")
                    break
            else:
                result.status = "completed"
                logger.info(f"Cell {cell_id} completed successfully")

            result.completed_at = datetime.now()

        except Exception as e:
            result.status = "error"
            result.error = str(e)
            result.completed_at = datetime.now()
            logger.error(f"Error executing cell {cell_id}: {e}", exc_info=True)

        return result

    def get_execution_result(self, cell_id: str) -> NotebookCellExecutionResult | None:
        """Get the result of a cell execution by ID."""
        return self._execution_results.get(cell_id)

    def list_execution_results(self) -> list[NotebookCellExecutionResult]:
        """Get all execution results."""
        return list(self._execution_results.values())

    async def restart_kernel(self) -> bool:
        """Restart the kernel."""
        logger.info("Restarting kernel...")
        await self.stop_kernel()
        self.nb = nbformat.v4.new_notebook()
        return await self.start_kernel()

    def get_kernel_status(self) -> dict[str, Any]:
        """Get the current status of the kernel."""
        return {
            "is_ready": self.is_ready,
            "is_starting": self.is_starting,
            "execution_count": len(self._execution_results),
            "kernel_id": self.client.km.kernel_id
            if self.client and hasattr(self.client, "km") and self.client.km
            else None,
        }
