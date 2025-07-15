import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from jupyter_client import KernelManager
from jupyter_client.kernelspec import get_kernel_spec


logger = logging.getLogger(__name__)


class NotebookCellExecutionResult:
    """Represents the result of executing a notebook cell."""

    def __init__(self, cell_id: str, code: str):
        self.cell_id = cell_id
        self.code = code
        self.execution_count: Optional[int] = None
        self.outputs: List[Dict[str, Any]] = []
        self.status: str = "pending"  # pending, running, completed, error
        self.error: Optional[str] = None
        self.started_at: datetime = datetime.now()
        self.completed_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for JSON serialization."""
        return {
            "cell_id": self.cell_id,
            "code": self.code,
            "execution_count": self.execution_count,
            "outputs": self.outputs,
            "status": self.status,
            "error": self.error,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class JupyterKernelManager:
    """Manages a Jupyter Python kernel for executing notebook cells."""

    def __init__(self):
        self.kernel_manager: Optional[KernelManager] = None
        self.kernel_client = None
        self.is_starting = False
        self.is_ready = False
        self._execution_results: Dict[str, NotebookCellExecutionResult] = {}

    async def start_kernel(self) -> bool:
        """Start the Jupyter kernel asynchronously."""
        if self.is_starting or self.is_ready:
            return self.is_ready

        self.is_starting = True
        try:
            logger.info("Starting Jupyter Python kernel...")

            # Get the Python kernel spec
            kernel_spec = get_kernel_spec("python3")

            # Create and start kernel manager
            self.kernel_manager = KernelManager(kernel_name="python3")
            await asyncio.get_event_loop().run_in_executor(
                None, self.kernel_manager.start_kernel
            )

            # Get the client
            self.kernel_client = self.kernel_manager.client()
            self.kernel_client.start_channels()

            # Wait for kernel to be ready
            await asyncio.get_event_loop().run_in_executor(
                None, self.kernel_client.wait_for_ready, 30
            )

            self.is_ready = True
            logger.info("Jupyter kernel started successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to start Jupyter kernel: {e}")
            self.is_ready = False
            return False
        finally:
            self.is_starting = False

    async def stop_kernel(self):
        """Stop the Jupyter kernel."""
        if self.kernel_client:
            self.kernel_client.stop_channels()
            self.kernel_client = None

        if self.kernel_manager:
            await asyncio.get_event_loop().run_in_executor(
                None, self.kernel_manager.shutdown_kernel
            )
            self.kernel_manager = None

        self.is_ready = False
        logger.info("Jupyter kernel stopped")

    async def execute_cell(self, code: str, cell_id: Optional[str] = None) -> NotebookCellExecutionResult:
        """Execute a cell of code in the kernel."""
        if not self.is_ready:
            raise RuntimeError("Kernel is not ready. Call start_kernel() first.")

        if not cell_id:
            cell_id = str(uuid.uuid4())

        result = NotebookCellExecutionResult(cell_id, code)
        self._execution_results[cell_id] = result

        try:
            result.status = "running"
            logger.info(f"Executing cell {cell_id}")

            # Execute the code
            msg_id = await asyncio.get_event_loop().run_in_executor(
                None, self.kernel_client.execute, code
            )

            # Collect outputs
            await self._collect_outputs(msg_id, result)

            result.status = "completed"
            result.completed_at = datetime.now()

        except Exception as e:
            result.status = "error"
            result.error = str(e)
            result.completed_at = datetime.now()
            logger.error(f"Error executing cell {cell_id}: {e}")

        return result

    async def _collect_outputs(self, msg_id: str, result: NotebookCellExecutionResult):
        """Collect all outputs from a code execution."""
        def collect():
            outputs = []
            execution_count = None

            while True:
                try:
                    msg = self.kernel_client.get_iopub_msg(timeout=1)
                    if msg['parent_header'].get('msg_id') != msg_id:
                        continue

                    msg_type = msg['msg_type']
                    content = msg['content']

                    if msg_type == 'execute_input':
                        execution_count = content.get('execution_count')
                    elif msg_type in ['execute_result', 'display_data']:
                        outputs.append({
                            'output_type': msg_type,
                            'execution_count': content.get('execution_count'),
                            'data': content.get('data', {}),
                            'metadata': content.get('metadata', {})
                        })
                    elif msg_type == 'stream':
                        outputs.append({
                            'output_type': 'stream',
                            'name': content.get('name'),
                            'text': content.get('text')
                        })
                    elif msg_type == 'error':
                        outputs.append({
                            'output_type': 'error',
                            'ename': content.get('ename'),
                            'evalue': content.get('evalue'),
                            'traceback': content.get('traceback', [])
                        })
                    elif msg_type == 'status' and content.get('execution_state') == 'idle':
                        break

                except Exception:
                    break

            return outputs, execution_count

        # Run the collection in executor to avoid blocking
        outputs, execution_count = await asyncio.get_event_loop().run_in_executor(
            None, collect
        )

        result.outputs = outputs
        result.execution_count = execution_count

    def get_execution_result(self, cell_id: str) -> Optional[NotebookCellExecutionResult]:
        """Get the result of a cell execution by ID."""
        return self._execution_results.get(cell_id)

    def list_execution_results(self) -> List[NotebookCellExecutionResult]:
        """Get all execution results."""
        return list(self._execution_results.values())

    async def restart_kernel(self) -> bool:
        """Restart the kernel."""
        logger.info("Restarting kernel...")
        await self.stop_kernel()
        return await self.start_kernel()

    def get_kernel_status(self) -> Dict[str, Any]:
        """Get the current status of the kernel."""
        return {
            "is_ready": self.is_ready,
            "is_starting": self.is_starting,
            "execution_count": len(self._execution_results),
            "kernel_id": self.kernel_manager.kernel_id if self.kernel_manager else None,
        }


# Global kernel manager instance
kernel_manager = JupyterKernelManager()


async def get_kernel_manager() -> JupyterKernelManager:
    """Get the global kernel manager instance."""
    return kernel_manager


async def initialize_kernel():
    """Initialize the kernel on startup."""
    logger.info("Initializing Jupyter kernel...")
    success = await kernel_manager.start_kernel()
    if success:
        logger.info("Kernel initialized successfully")
    else:
        logger.error("Failed to initialize kernel")
    return success


async def shutdown_kernel():
    """Shutdown the kernel on app shutdown."""
    logger.info("Shutting down Jupyter kernel...")
    await kernel_manager.stop_kernel()
