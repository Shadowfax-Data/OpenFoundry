import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from nbformat import write
from openfoundry_types import (
    DeleteCellResponse,
    ExecuteCodeRequest,
    KernelStatusResponse,
    StopExecutionRequest,
    StopExecutionResponse,
    TailCellsResult,
)

from openfoundry_sandbox.cell_executor import (
    CellExecutor,
    ExecutionEvent,
    KernelStatus,
)
from openfoundry_sandbox.config import get_notebook_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notebook", tags=["notebook"])


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
    )


@router.get("/status", response_model=KernelStatusResponse)
async def get_kernel_status():
    """Get the current status of the kernel."""
    current_status = cell_executor.get_kernel_status()
    return KernelStatusResponse(
        is_ready=cell_executor.is_kernel_ready(),
        is_starting=current_status
        in [KernelStatus.STARTING, KernelStatus.INITIALIZING],
        is_initializing=current_status == KernelStatus.INITIALIZING,
        kernel_id=cell_executor.get_kernel_id(),
    )


@router.get("/notebook")
async def get_notebook():
    """Get the complete notebook data including all cells and their results."""
    return await cell_executor.get_notebook()


@router.get("/tail", response_model=TailCellsResult)
async def get_tail_cells(num_cells: int = 5):
    """Get the last N cells from the notebook.

    Args:
        num_cells: Number of cells to retrieve from the end (default: 5)

    Returns:
        Dictionary containing the last N cells with their outputs
    """
    if num_cells < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="num_cells must be non-negative",
        )

    return await cell_executor.tail_cells(num_cells)


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
    logger.info("Jupyter kernel started, now auto-executing initial cells...")

    # Auto-execute all cells upon initialization (synchronously)
    try:
        code_cells = [
            cell for cell in cell_executor.nb.cells if cell.cell_type == "code"
        ]
        if code_cells:
            logger.info(
                f"Auto-executing {len(code_cells)} code cells on initialization..."
            )

            # Run all cells synchronously and wait for completion
            async for event in cell_executor.rerun_notebook():
                # Log execution progress
                if event.event_type == "started":
                    logger.debug(f"Auto-executing cell {event.cell_id}")
                elif event.event_type == "completed":
                    logger.debug(f"Completed auto-execution of cell {event.cell_id}")
                elif event.event_type == "error":
                    logger.warning(
                        f"Error in auto-execution of cell {event.cell_id}: {event.data.get('error', 'Unknown error')}"
                    )

            logger.info("Auto-execution of all cells completed successfully")
        else:
            logger.info("No code cells found to auto-execute")
    except Exception as e:
        logger.error(f"Error during auto-execution of cells: {e}")
    finally:
        # Always mark initialization as complete - kernel is now ready
        # This ensures the kernel doesn't get stuck in initializing state
        cell_executor.complete_initialization()


async def cleanup_notebook():
    """Cleanup notebook resources on shutdown."""
    logger.info("Cleaning up Jupyter kernel...")

    # Use the dedicated shutdown method
    success = await cell_executor.shutdown_kernel()
    if success:
        logger.info("Jupyter kernel cleaned up successfully")
    else:
        logger.error("Failed to clean up Jupyter kernel")
