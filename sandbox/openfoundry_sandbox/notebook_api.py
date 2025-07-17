import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from openfoundry_sandbox.kernel_manager import (
    CellIdNotFoundError,
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
    cell_id: str | None = Field(
        None, description="Optional unique identifier for this cell execution"
    )


class KernelStatusResponse(BaseModel):
    """Response model for kernel status."""

    is_ready: bool = Field(..., description="Whether the kernel is ready for execution")
    is_starting: bool = Field(
        ..., description="Whether the kernel is currently starting"
    )
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
    logger.info(
        f"Executing code with cell_id '{request.cell_id}': {request.code[:100]}..."
    )
    try:
        return await kernel_manager.execute_code(request.code, request.cell_id)
    except CellIdNotFoundError as e:
        logger.error(
            f"Cell with ID '{request.cell_id}' does not exist in the notebook."
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{e}. Please either provide a valid cell_id to execute an existing cell or do not provide one to create and execute a new cell.",
        )


@router.get("/status", response_model=KernelStatusResponse)
async def get_kernel_status():
    """Get the current status of the kernel."""
    return KernelStatusResponse(
        is_ready=kernel_manager.is_kernel_ready(),
        is_starting=kernel_manager.is_kernel_starting(),
        kernel_id=kernel_manager.get_kernel_id() or "none",
    )


@router.get("/notebook")
async def get_notebook():
    """Get the complete notebook data including all cells and their results."""
    return await kernel_manager.get_notebook()


@router.post("/restart")
async def restart_kernel():
    """Restart the kernel (clears all variables and state)."""
    await kernel_manager.restart_kernel()
    return {"message": "Kernel restarted successfully"}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health status of the notebook functionality."""
    return HealthResponse(
        status="healthy", kernel_available=kernel_manager.is_kernel_ready()
    )


# --- Lifecycle Management ---


async def initialize_notebook():
    """Initialize the notebook kernel on startup."""
    await initialize_kernel(kernel_manager)


async def cleanup_notebook():
    """Cleanup notebook resources on shutdown."""
    await cleanup_kernel(kernel_manager)
