import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Path, status
from jupyter_client.kernelspec import KernelSpecManager
from jupyter_client.manager import KernelManager
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notebook", tags=["notebook"])


# --- Pydantic Models ---


class ExecuteCodeRequest(BaseModel):
    """Request model for executing code in the Jupyter kernel."""

    code: str = Field(..., description="Python code to execute")
    cell_id: Optional[str] = Field(None, description="Optional custom cell ID")


class OutputModel(BaseModel):
    """Model for a single output from code execution."""

    output_type: str = Field(
        ..., description="Type of output (stream, execute_result, display_data, error)"
    )
    name: Optional[str] = Field(None, description="Stream name for stream outputs")
    text: Optional[str] = Field(None, description="Text content for stream outputs")
    data: Optional[Dict[str, Any]] = Field(
        None, description="Data content for display outputs"
    )
    metadata: Optional[Dict[str, Any]] = Field(None, description="Metadata for outputs")
    execution_count: Optional[int] = Field(
        None, description="Execution count for execute_result"
    )
    ename: Optional[str] = Field(None, description="Exception name for error outputs")
    evalue: Optional[str] = Field(None, description="Exception value for error outputs")
    traceback: Optional[List[str]] = Field(
        None, description="Exception traceback for error outputs"
    )


class ExecuteCodeResponse(BaseModel):
    """Response model for code execution."""

    cell_id: str = Field(..., description="Unique identifier for this execution")
    code: str = Field(..., description="The executed code")
    execution_count: int = Field(..., description="Execution count from the kernel")
    outputs: List[OutputModel] = Field(
        default_factory=list, description="List of outputs from execution"
    )
    status: str = Field(..., description="Execution status (completed, error)")
    error: Optional[str] = Field(None, description="Error message if execution failed")
    started_at: str = Field(..., description="ISO timestamp when execution started")
    completed_at: str = Field(..., description="ISO timestamp when execution completed")


class KernelStatusResponse(BaseModel):
    """Response model for kernel status."""

    is_ready: bool = Field(..., description="Whether the kernel is ready for execution")
    is_starting: bool = Field(
        ..., description="Whether the kernel is currently starting"
    )
    execution_count: int = Field(..., description="Current execution count")
    kernel_id: str = Field(..., description="Unique kernel identifier")


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str = Field(..., description="Health status")
    kernel_available: bool = Field(
        ..., description="Whether kernel functionality is available"
    )


# --- Kernel Manager Class ---


class NotebookKernelManager:
    """Manages a persistent Jupyter kernel for code execution."""

    def __init__(self):
        self.kernel_manager: Optional[KernelManager] = None
        self.kernel_client = None
        self.execution_count = 0
        self.execution_results: Dict[str, ExecuteCodeResponse] = {}
        self.kernel_id: Optional[str] = None
        self._starting = False
        self._lock = asyncio.Lock()

    async def start_kernel(self):
        """Start the Jupyter kernel."""
        async with self._lock:
            if self.kernel_manager is not None and self.kernel_manager.is_alive():
                logger.info("Kernel is already running")
                return

            self._starting = True
            try:
                logger.info("Starting Jupyter kernel...")

                # Create kernel manager
                self.kernel_manager = KernelManager()

                assert (
                    self.kernel_manager is not None
                ), "Kernel manager is not initialized"

                # Get the Python kernel spec
                ksm = KernelSpecManager()
                kernel_name = "python3"
                if kernel_name not in ksm.get_all_specs():
                    # Fallback to any available Python kernel
                    available_kernels = ksm.get_all_specs()
                    python_kernels = [
                        k for k in available_kernels.keys() if "python" in k.lower()
                    ]
                    if python_kernels:
                        kernel_name = python_kernels[0]
                    else:
                        raise RuntimeError("No Python kernel specification found")

                self.kernel_manager.kernel_name = kernel_name

                # Start the kernel
                await asyncio.to_thread(self.kernel_manager.start_kernel)

                # Create client
                self.kernel_client = self.kernel_manager.client()
                await asyncio.to_thread(self.kernel_client.start_channels)

                # Wait for kernel to be ready
                await asyncio.to_thread(self.kernel_client.wait_for_ready, timeout=30)

                self.kernel_id = str(uuid.uuid4())
                self.execution_count = 0

                logger.info(f"Kernel started successfully with ID: {self.kernel_id}")

            except Exception as e:
                logger.error(f"Failed to start kernel: {e}")
                self.kernel_manager = None
                self.kernel_client = None
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to start kernel: {str(e)}",
                )
            finally:
                self._starting = False

    async def restart_kernel(self):
        """Restart the kernel, clearing all state."""
        async with self._lock:
            logger.info("Restarting kernel...")

            # Stop existing kernel
            if self.kernel_manager is not None:
                try:
                    await asyncio.to_thread(
                        self.kernel_manager.shutdown_kernel, now=True
                    )
                except Exception as e:
                    logger.warning(f"Error stopping kernel: {e}")

            # Clear state
            self.kernel_manager = None
            self.kernel_client = None
            self.execution_count = 0
            self.kernel_id = None

            # Start new kernel
            await self.start_kernel()

    def is_ready(self) -> bool:
        """Check if the kernel is ready for execution."""
        return (
            self.kernel_manager is not None
            and self.kernel_client is not None
            and self.kernel_manager.is_alive()
            and not self._starting
        )

    def is_starting(self) -> bool:
        """Check if the kernel is currently starting."""
        return self._starting

    async def execute_code(
        self, code: str, cell_id: Optional[str] = None
    ) -> ExecuteCodeResponse:
        """Execute code in the kernel and return the results."""
        if not self.is_ready():
            if not self.is_starting():
                await self.start_kernel()
            if not self.is_ready():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Kernel is not ready for execution",
                )

        if cell_id is None:
            cell_id = str(uuid.uuid4())

        started_at = datetime.utcnow().isoformat()

        try:
            assert self.kernel_client is not None, "Kernel client is not initialized"
            # Execute the code
            msg_id = await asyncio.to_thread(self.kernel_client.execute, code)

            # Collect outputs
            outputs = []
            execution_count = None
            status_result = "completed"
            error_msg = None

            while True:
                try:
                    # Get message with timeout
                    msg = await asyncio.to_thread(
                        self.kernel_client.get_iopub_msg, timeout=30
                    )

                    if msg["parent_header"].get("msg_id") != msg_id:
                        continue

                    msg_type = msg["header"]["msg_type"]
                    content = msg["content"]

                    if msg_type == "status":
                        if content["execution_state"] == "idle":
                            break

                    elif msg_type == "execute_input":
                        execution_count = content["execution_count"]

                    elif msg_type == "stream":
                        outputs.append(
                            OutputModel(
                                output_type="stream",
                                name=content["name"],
                                text=content["text"],
                                data=None,
                                metadata=None,
                                execution_count=None,
                                ename=None,
                                evalue=None,
                                traceback=None,
                            )
                        )

                    elif msg_type == "execute_result":
                        outputs.append(
                            OutputModel(
                                output_type="execute_result",
                                data=content["data"],
                                metadata=content.get("metadata", {}),
                                execution_count=content["execution_count"],
                                name=None,
                                text=None,
                                ename=None,
                                evalue=None,
                                traceback=None,
                            )
                        )

                    elif msg_type == "display_data":
                        outputs.append(
                            OutputModel(
                                output_type="display_data",
                                data=content["data"],
                                metadata=content.get("metadata", {}),
                                name=None,
                                text=None,
                                execution_count=None,
                                ename=None,
                                evalue=None,
                                traceback=None,
                            )
                        )

                    elif msg_type == "error":
                        outputs.append(
                            OutputModel(
                                output_type="error",
                                ename=content["ename"],
                                evalue=content["evalue"],
                                traceback=content["traceback"],
                                name=None,
                                text=None,
                                data=None,
                                metadata=None,
                                execution_count=None,
                            )
                        )
                        status_result = (
                            "completed"  # Errors don't fail execution, they're captured
                        )
                        error_msg = f"{content['ename']}: {content['evalue']}"

                except asyncio.TimeoutError:
                    logger.warning("Timeout waiting for kernel message")
                    break
                except Exception as e:
                    logger.error(f"Error reading kernel message: {e}")
                    break

            # Update execution count
            if execution_count is not None:
                self.execution_count = execution_count

            completed_at = datetime.utcnow().isoformat()

            # Create response
            response = ExecuteCodeResponse(
                cell_id=cell_id,
                code=code,
                execution_count=execution_count or self.execution_count,
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

    def get_result(self, cell_id: str) -> Optional[ExecuteCodeResponse]:
        """Get the result of a specific cell execution."""
        return self.execution_results.get(cell_id)

    def get_all_results(self) -> List[ExecuteCodeResponse]:
        """Get all execution results."""
        return list(self.execution_results.values())

    def clear_results(self):
        """Clear stored execution results (keep kernel running)."""
        self.execution_results.clear()


# Global kernel manager instance
kernel_manager = NotebookKernelManager()


# --- API Endpoints ---


@router.post("/execute", response_model=ExecuteCodeResponse)
async def execute_code(request: ExecuteCodeRequest):
    """Execute Python code in the kernel."""
    logger.info(f"Executing code: {request.code[:100]}...")
    return await kernel_manager.execute_code(request.code, request.cell_id)


@router.get("/status", response_model=KernelStatusResponse)
async def get_kernel_status():
    """Get the current status of the kernel."""
    return KernelStatusResponse(
        is_ready=kernel_manager.is_ready(),
        is_starting=kernel_manager.is_starting(),
        execution_count=kernel_manager.execution_count,
        kernel_id=kernel_manager.kernel_id or "none",
    )


@router.get("/results/{cell_id}", response_model=ExecuteCodeResponse)
async def get_execution_result(
    cell_id: str = Path(..., description="Cell ID to retrieve"),
):
    """Get the result of a specific cell execution."""
    result = kernel_manager.get_result(cell_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No result found for cell_id: {cell_id}",
        )
    return result


@router.get("/results", response_model=List[ExecuteCodeResponse])
async def get_all_results():
    """Get all execution results from the current session."""
    return kernel_manager.get_all_results()


@router.post("/restart")
async def restart_kernel():
    """Restart the kernel (clears all variables and state)."""
    await kernel_manager.restart_kernel()
    return {"message": "Kernel restarted successfully"}


@router.post("/start")
async def start_kernel():
    """Manually start the kernel (usually done automatically)."""
    await kernel_manager.start_kernel()
    return {"message": "Kernel started successfully"}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health status of the notebook functionality."""
    return HealthResponse(status="healthy", kernel_available=kernel_manager.is_ready())


@router.delete("/clear-results")
async def clear_results():
    """Clear stored execution results (keeps kernel running)."""
    kernel_manager.clear_results()
    return {"message": "Execution results cleared"}


# --- Lifecycle Management ---


async def initialize_notebook():
    """Initialize the notebook kernel on startup."""
    try:
        logger.info("Initializing notebook kernel...")
        await kernel_manager.start_kernel()
        logger.info("Notebook kernel initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize notebook kernel: {e}")
        # Don't raise - let the server start and kernel can be started later


async def cleanup_notebook():
    """Cleanup notebook resources on shutdown."""
    try:
        logger.info("Cleaning up notebook kernel...")
        if kernel_manager.kernel_manager is not None:
            await asyncio.to_thread(
                kernel_manager.kernel_manager.shutdown_kernel, now=True
            )
        logger.info("Notebook kernel cleaned up successfully")
    except Exception as e:
        logger.error(f"Error cleaning up notebook kernel: {e}")
