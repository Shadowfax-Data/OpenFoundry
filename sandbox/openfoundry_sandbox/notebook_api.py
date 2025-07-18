import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from nbformat import write
from pydantic import BaseModel, Field

from openfoundry_sandbox.kernel_manager import (
    ExecuteCodeResponse,
    JupyterKernelManager,
    cleanup_kernel,
    get_notebook_path,
    initialize_kernel,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notebook", tags=["notebook"])


# --- Pydantic Models ---


class ExecuteCodeRequest(BaseModel):
    """Request model for executing code in the Jupyter kernel."""

    code: str = Field(..., description="Python code to execute")
    cell_id: str = Field(..., description="Unique identifier for this cell execution")


class KernelStatusResponse(BaseModel):
    """Response model for kernel status."""

    is_ready: bool = Field(..., description="Whether the kernel is ready for execution")
    is_starting: bool = Field(
        ..., description="Whether the kernel is currently starting"
    )
    kernel_id: str | None = Field(None, description="Unique kernel identifier")


class RerunNotebookResponse(BaseModel):
    """Response model for re-running all notebook cells."""

    total_cells: int = Field(..., description="Total number of cells executed")
    successful_cells: int = Field(
        ..., description="Number of successfully executed cells"
    )
    failed_cells: int = Field(..., description="Number of cells that failed execution")
    execution_results: list[ExecuteCodeResponse] = Field(
        ..., description="Detailed execution results for each cell"
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
    return await kernel_manager.execute_code(request.code, request.cell_id)


@router.get("/status", response_model=KernelStatusResponse)
async def get_kernel_status():
    """Get the current status of the kernel."""
    return KernelStatusResponse(
        is_ready=kernel_manager.is_kernel_ready(),
        is_starting=kernel_manager.is_kernel_starting(),
        kernel_id=kernel_manager.get_kernel_id(),
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


@router.post("/save")
async def save_notebook():
    """Save the current notebook to the configured file path."""
    logger.info("Saving notebook to file")

    # Get the notebook path from environment variable
    notebook_path = get_notebook_path()
    if not notebook_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Notebook path not found in environment configuration",
        )

    # Get the current notebook from kernel manager
    notebook = await kernel_manager.get_notebook()

    # Ensure parent directory exists
    parent_dir = Path(notebook_path).parent
    parent_dir.mkdir(parents=True, exist_ok=True)

    # Save the notebook to file
    with open(notebook_path, "w") as f:
        write(notebook, f)

    logger.info(f"Successfully saved notebook to {notebook_path}")

    return {"message": "Notebook saved successfully"}


@router.post("/rerun", response_model=RerunNotebookResponse)
async def rerun_notebook():
    """Re-run all cells in the notebook in order."""
    logger.info("Re-running all cells in notebook")
    try:
        execution_results = await kernel_manager.rerun_notebook()

        # Calculate summary statistics
        total_cells = len(execution_results)
        successful_cells = sum(
            1 for result in execution_results if result.status == "completed"
        )
        failed_cells = total_cells - successful_cells

        logger.info(
            f"Notebook rerun completed: {successful_cells}/{total_cells} cells successful"
        )

        return RerunNotebookResponse(
            total_cells=total_cells,
            successful_cells=successful_cells,
            failed_cells=failed_cells,
            execution_results=execution_results,
        )
    except Exception as e:
        logger.error(f"Error during notebook rerun: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rerun notebook: {str(e)}",
        )


# --- Lifecycle Management ---


async def initialize_notebook():
    """Initialize the notebook kernel on startup."""
    await initialize_kernel(kernel_manager)


async def cleanup_notebook():
    """Cleanup notebook resources on shutdown."""
    await cleanup_kernel(kernel_manager)
