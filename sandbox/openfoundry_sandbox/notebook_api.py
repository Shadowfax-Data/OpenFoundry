import logging

from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from openfoundry_sandbox.kernel_manager import (
    ExecuteCodeResponse,
    JupyterKernelManager,
    cleanup_kernel,
    initialize_kernel,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notebook", tags=["notebook"])


# --- Pydantic Models ---


class ExecuteCodeRequest(BaseModel):
    """Request model for executing code in the Jupyter kernel."""

    code: str = Field(..., description="Python code to execute")
    cell_id: str | None = Field(None, description="Optional custom cell ID")


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


# Global kernel manager instance
kernel_manager = JupyterKernelManager()


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
        is_ready=kernel_manager.is_kernel_ready(),
        is_starting=kernel_manager.is_kernel_starting(),
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


@router.get("/results", response_model=list[ExecuteCodeResponse])
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
    return HealthResponse(
        status="healthy", kernel_available=kernel_manager.is_kernel_ready()
    )


@router.delete("/clear-results")
async def clear_results():
    """Clear stored execution results (keeps kernel running)."""
    kernel_manager.clear_results()
    return {"message": "Execution results cleared"}


# --- Lifecycle Management ---


async def initialize_notebook():
    """Initialize the notebook kernel on startup."""
    await initialize_kernel(kernel_manager)


async def cleanup_notebook():
    """Cleanup notebook resources on shutdown."""
    await cleanup_kernel(kernel_manager)
