import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from openfoundry_sandbox.notebook_runner import get_kernel_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebook", tags=["notebook"])


# Pydantic models for request/response
class ExecuteCellRequest(BaseModel):
    """Request model for executing a notebook cell."""

    code: str = Field(..., description="Python code to execute")
    cell_id: str | None = Field(None, description="Optional cell ID for tracking")


class ExecuteCellResponse(BaseModel):
    """Response model for cell execution."""

    cell_id: str
    code: str
    execution_count: int | None
    outputs: list[dict[str, Any]]
    status: str
    error: str | None
    started_at: str
    completed_at: str | None


class KernelStatusResponse(BaseModel):
    """Response model for kernel status."""

    is_ready: bool
    is_starting: bool
    execution_count: int
    kernel_id: str | None


@router.post("/execute", response_model=ExecuteCellResponse)
async def execute_cell(request: ExecuteCellRequest):
    """Execute a cell of Python code in the Jupyter kernel.

    The code will be executed in the persistent kernel, maintaining state
    between executions (variables, imports, etc.).
    """
    try:
        kernel_manager = await get_kernel_manager()

        if not kernel_manager.is_ready:
            raise HTTPException(
                status_code=503,
                detail="Kernel is not ready. Please check kernel status.",
            )

        # Execute the cell
        result = await kernel_manager.execute_cell(
            code=request.code, cell_id=request.cell_id
        )

        return ExecuteCellResponse(**result.to_dict())

    except Exception as e:
        logger.error(f"Error executing cell: {e}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.get("/status", response_model=KernelStatusResponse)
async def get_kernel_status():
    """Get the current status of the Jupyter kernel."""
    try:
        kernel_manager = await get_kernel_manager()
        status = kernel_manager.get_kernel_status()
        return KernelStatusResponse(**status)

    except Exception as e:
        logger.error(f"Error getting kernel status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.get("/results/{cell_id}", response_model=ExecuteCellResponse)
async def get_execution_result(cell_id: str):
    """Get the result of a specific cell execution by ID."""
    try:
        kernel_manager = await get_kernel_manager()
        result = kernel_manager.get_execution_result(cell_id)

        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"No execution result found for cell ID: {cell_id}",
            )

        return ExecuteCellResponse(**result.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting execution result: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get result: {str(e)}")


@router.get("/results", response_model=list[ExecuteCellResponse])
async def list_execution_results():
    """Get all execution results from the current session."""
    try:
        kernel_manager = await get_kernel_manager()
        results = kernel_manager.list_execution_results()

        return [ExecuteCellResponse(**result.to_dict()) for result in results]

    except Exception as e:
        logger.error(f"Error listing execution results: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list results: {str(e)}")


@router.post("/restart")
async def restart_kernel():
    """Restart the Jupyter kernel.

    This will clear all variables and state, starting fresh.
    All previous execution results will be preserved.
    """
    try:
        kernel_manager = await get_kernel_manager()
        success = await kernel_manager.restart_kernel()

        if not success:
            raise HTTPException(status_code=500, detail="Failed to restart kernel")

        return {"message": "Kernel restarted successfully", "success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restarting kernel: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to restart kernel: {str(e)}"
        )


@router.post("/start")
async def start_kernel():
    """Start the Jupyter kernel if it's not already running.

    This is typically called automatically on server startup,
    but can be used to manually start the kernel if needed.
    """
    try:
        kernel_manager = await get_kernel_manager()

        if kernel_manager.is_ready:
            return {"message": "Kernel is already running", "success": True}

        success = await kernel_manager.start_kernel()

        if not success:
            raise HTTPException(status_code=500, detail="Failed to start kernel")

        return {"message": "Kernel started successfully", "success": True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting kernel: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start kernel: {str(e)}")


@router.delete("/clear-results")
async def clear_execution_results():
    """Clear all stored execution results (but keep the kernel running)."""
    try:
        kernel_manager = await get_kernel_manager()
        kernel_manager._execution_results.clear()

        return {"message": "Execution results cleared", "success": True}

    except Exception as e:
        logger.error(f"Error clearing results: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to clear results: {str(e)}"
        )


# Health check endpoint specifically for notebook functionality
@router.get("/health")
async def notebook_health():
    """Health check for notebook functionality."""
    try:
        kernel_manager = await get_kernel_manager()
        status = kernel_manager.get_kernel_status()

        return {
            "status": "healthy"
            if status["is_ready"]
            else "starting"
            if status["is_starting"]
            else "down",
            "kernel_ready": status["is_ready"],
            "kernel_starting": status["is_starting"],
            "execution_count": status["execution_count"],
        }

    except Exception as e:
        logger.error(f"Notebook health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "kernel_ready": False,
            "kernel_starting": False,
            "execution_count": 0,
        }
