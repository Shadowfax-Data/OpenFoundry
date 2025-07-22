import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from nbformat import write
from pydantic import BaseModel, Field

from openfoundry_sandbox.cell_executor import (
    CellExecutor,
    ExecutionEvent,
    KernelStatus,
)
from openfoundry_sandbox.config import get_notebook_path

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


class DeleteCellRequest(BaseModel):
    """Request model for deleting a cell."""

    cell_id: str = Field(..., description="Unique identifier of the cell to delete")


class DeleteCellResponse(BaseModel):
    """Response model for cell deletion."""

    success: bool = Field(..., description="Whether the deletion was successful")
    message: str = Field(..., description="Deletion result message")
    cell_id: str = Field(..., description="ID of the cell that was deleted")


class StopExecutionRequest(BaseModel):
    """Request model for stopping cell execution."""

    cell_id: str | None = Field(
        None,
        description="Optional specific cell ID to stop (if not provided, stops any currently executing cell)",
    )


class StopExecutionResponse(BaseModel):
    """Response model for stopping execution."""

    success: bool = Field(..., description="Whether the stop operation was successful")
    message: str = Field(..., description="Result message")


class RestartKernelResponse(BaseModel):
    """Response model for kernel restart."""

    success: bool = Field(..., description="Whether the restart was successful")
    message: str = Field(..., description="Restart result message")
    kernel_id: str | None = Field(
        None, description="New kernel ID if restart was successful"
    )


# Global cell executor instance
cell_executor = CellExecutor()


# --- API Endpoints ---


@router.post("/execute/stream")
async def execute_code_stream(request: ExecuteCodeRequest):
    """Execute Python code in the kernel with streaming output."""
    logger.info(
        f"Streaming execution for cell_id '{request.cell_id}': {request.code[:100]}..."
    )

    async def event_generator():
        """Generate SSE events from the execution stream."""
        try:
            async for event in cell_executor.execute_code_streaming(
                request.code, request.cell_id
            ):
                # Format as Server-Sent Events
                event_data = event.model_dump_json()
                yield f"data: {event_data}\n\n"
        except Exception as e:
            logger.error(f"Error in streaming execution: {e}")
            # Send error event
            error_event = ExecutionEvent(
                event_type="error",
                cell_id=request.cell_id,
                timestamp="",
                data={"error": str(e)},
            )
            yield f"data: {error_event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get("/status", response_model=KernelStatusResponse)
async def get_kernel_status():
    """Get the current status of the kernel."""
    return KernelStatusResponse(
        is_ready=cell_executor.is_kernel_ready(),
        is_starting=cell_executor.get_kernel_status() == KernelStatus.STARTING,
        kernel_id=cell_executor.get_kernel_id(),
    )


@router.get("/notebook")
async def get_notebook():
    """Get the complete notebook data including all cells and their results."""
    return await cell_executor.get_notebook()


@router.post("/stop", response_model=StopExecutionResponse)
async def stop_execution(request: StopExecutionRequest):
    """Stop/interrupt the currently executing cell."""
    logger.info(f"Stopping execution for cell_id: {request.cell_id}")

    success = await cell_executor.interrupt_execution()

    if success:
        message = "Successfully interrupted execution"
        if request.cell_id:
            message += f" for cell {request.cell_id}"
        logger.info(message)
        return StopExecutionResponse(message=message, success=True)
    else:
        message = "No execution to interrupt or interrupt failed"
        logger.warning(message)
        return StopExecutionResponse(message=message, success=False)


@router.post("/restart", response_model=RestartKernelResponse)
async def restart_kernel():
    """Restart the Jupyter kernel."""
    logger.info("Restarting kernel via API")

    success = await cell_executor.restart_kernel()

    if success:
        message = "Kernel restarted successfully"
        new_kernel_id = cell_executor.get_kernel_id()
        logger.info(f"{message}. New kernel ID: {new_kernel_id}")
        return RestartKernelResponse(
            success=True, message=message, kernel_id=new_kernel_id
        )
    else:
        message = "Failed to restart kernel"
        logger.error(message)
        return RestartKernelResponse(success=False, message=message, kernel_id=None)


@router.post("/save")
async def save_notebook():
    """Save the current notebook to the configured file path."""
    logger.info("Saving notebook to file")

    # Get the notebook path from environment variable
    notebook_path = get_notebook_path()
    if not notebook_path:
        logger.info("Not saving notebook to file")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Notebook path not found in environment configuration",
        )
    logger.info(f"Saving notebook to {notebook_path}")
    # Get the current notebook from cell executor
    notebook = await cell_executor.get_notebook()

    # Ensure parent directory exists
    parent_dir = Path(notebook_path).parent
    parent_dir.mkdir(parents=True, exist_ok=True)

    # Save the notebook to file
    with open(notebook_path, "w") as f:
        write(notebook, f)

    logger.info(f"Successfully saved notebook to {notebook_path}")

    return {"message": "Notebook saved successfully"}


@router.post("/rerun")
async def rerun_notebook_stream():
    """Re-run all cells in the notebook in order with streaming output."""
    logger.info("Re-running all cells in notebook with streaming")

    async def event_generator():
        """Generate SSE events from the rerun stream."""
        try:
            async for event in cell_executor.rerun_notebook():
                # Format as Server-Sent Events
                event_data = event.model_dump_json()
                yield f"data: {event_data}\n\n"
        except Exception as e:
            logger.error(f"Error in streaming rerun: {e}")
            # Send error event
            error_event = ExecutionEvent(
                event_type="error",
                cell_id="rerun_error",
                timestamp="",
                data={"error": str(e)},
            )
            yield f"data: {error_event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.delete("/cells/{cell_id}", response_model=DeleteCellResponse)
async def delete_cell(cell_id: str):
    """Delete a cell from the notebook by its ID."""
    logger.info(f"Deleting cell with ID: {cell_id}")

    success = cell_executor.delete_cell(cell_id)

    if success:
        message = f"Cell with ID '{cell_id}' deleted successfully"
        logger.info(message)
        return DeleteCellResponse(success=True, message=message, cell_id=cell_id)
    else:
        message = f"Cell with ID '{cell_id}' not found"
        logger.warning(message)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)


# --- Lifecycle Management ---


async def initialize_notebook():
    """Initialize the notebook kernel on startup."""
    logger.info("Initializing Jupyter kernel...")
    await cell_executor.start_kernel()
    logger.info("Jupyter kernel initialized successfully")


async def cleanup_notebook():
    """Cleanup notebook resources on shutdown."""
    logger.info("Cleaning up Jupyter kernel...")

    # Use the dedicated shutdown method
    success = await cell_executor.shutdown_kernel()
    if success:
        logger.info("Jupyter kernel cleaned up successfully")
    else:
        logger.error("Failed to clean up Jupyter kernel")
