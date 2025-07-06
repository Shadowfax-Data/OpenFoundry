import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request, status
from pydantic import BaseModel, Field

from pcb import ProcessControlBlock, ProcessStatus

# --- New Process Management Endpoints ---

logger = logging.getLogger(__name__)

router = APIRouter(tags=["pcb"])


# Models for Process Management
class RunRequest(BaseModel):
    """Request body for creating a new process run."""

    identifier: str = Field(
        ...,
        description="User-defined identifier for the type of process (e.g., 'data_processing', 'model_training'). This will be used as the key to map to PCB instances.",
        examples=["dry_run"],
    )
    command_str: str = Field(
        ...,
        description="The shell command string to execute. Will be parsed safely using shlex.",
        examples=["python pipeline_runner.py --dry_run"],
    )
    env: dict[str, str] | None = Field(
        None,
        description="Optional dictionary of environment variables to set for the subprocess. Merged with the agent's environment if provided.",
        examples=[{"DATA_SOURCE": "/data/input.csv", "API_KEY": "secret123"}],
    )
    stdin_commands: list[str] | None = Field(
        None,
        description="Optional list of strings to send to the process's stdin after starting. Each string will be sent as a separate line.",
        examples=[["help", "run", "exit"]],
    )
    cwd: str | None = Field(
        None,
        description="Optional working directory for the subprocess.",
        examples=["/workspace"],
    )


class RunResponse(BaseModel):
    """Response body after successfully starting a process run."""

    identifier: str = Field(
        ..., description="The identifier used to map to this PCB instance."
    )
    pid: int | None = Field(
        None, description="Process ID (PID) of the started process, if successful."
    )
    status: str = Field(
        ...,
        description="Initial status of the process (e.g., 'running', 'error_start').",
    )


class LogLinesResponse(BaseModel):
    """Response body for the peek endpoint."""

    identifier: str = Field(
        ..., description="Identifier of the process whose logs were read."
    )
    lines: list[str] = Field(..., description="List of complete log lines read.")
    lines_read_count: int = Field(
        ..., description="Number of lines returned in this response."
    )


class StdinRequest(BaseModel):
    """Request body for sending data to stdin."""

    data: str = Field(
        ...,
        description="The data to send to the process's standard input.",
        examples=["ls -la\n", "help\n", "exit\n"],
    )


class StdinResponse(BaseModel):
    """Response after sending data to stdin."""

    identifier: str = Field(
        ..., description="Identifier of the process that received the stdin data."
    )
    success: bool = Field(..., description="Whether the data was successfully sent.")
    error: str | None = Field(
        None, description="Error message if the operation failed."
    )


class TerminateResponse(BaseModel):
    """Response body after terminating a process run."""

    identifier: str = Field(
        ..., description="Identifier of the process that was terminated."
    )
    status: str = Field(
        ...,
        description="Final status of the process after the termination attempt (e.g., 'terminated', 'error_terminate').",
    )


class ProcessStats(BaseModel):
    """Detailed statistics for a process."""

    identifier: str = Field(..., description="Identifier of the process.")
    pid: int | None = Field(None, description="Process ID.")
    status: str = Field(
        ...,
        description="Current status reported by the agent (e.g., 'running', 'finished_ok').",
    )
    cpu_percent: float | None = Field(
        None, description="CPU usage percentage (requires careful handling in PCB)."
    )
    memory_rss_bytes: int | None = Field(
        None, description="Resident Set Size (RSS) memory usage in bytes."
    )
    memory_vms_bytes: int | None = Field(
        None, description="Virtual Memory Size (VMS) usage in bytes."
    )
    num_threads: int | None = Field(
        None, description="Number of threads used by the process."
    )
    create_time: str | None = Field(
        None, description="Timestamp when the process was created (ISO format UTC)."
    )
    psutil_status: str | None = Field(
        None,
        description="Raw status reported by psutil (e.g., 'running', 'sleeping', 'zombie').",
    )
    error: str | None = Field(
        None, description="Any error message encountered while retrieving stats."
    )


class RunInfo(BaseModel):
    """Summary information for a single process run, used in the list endpoint."""

    identifier: str = Field(..., description="User-defined identifier.")
    command_str: str = Field(..., description="The original command string.")
    env: dict[str, str] | None = Field(
        None, description="Environment variables set for the run (full dict)."
    )
    start_time: str = Field(
        ..., description="Timestamp when the run was initiated (ISO format UTC)."
    )
    end_time: str | None = Field(
        None,
        description="Timestamp when the run finished or was terminated (ISO format UTC).",
    )
    status: str = Field(..., description="Current status of the run.")


# --- Global State for Process Management ---


def get_active_processes(request: Request) -> dict[str, ProcessControlBlock]:
    """Get the active processes dictionary, mapping identifier to PCB instance."""
    if not hasattr(request.app.state, "active_processes"):
        logger.info("Creating new active_processes dictionary - app state was empty")
        request.app.state.active_processes = {}
    else:
        logger.info(
            f"Found existing active_processes with {len(request.app.state.active_processes)} processes: {list(request.app.state.active_processes.keys())}"
        )
    return request.app.state.active_processes


# --- Helper Functions ---
def get_pcb_or_404(
    identifier: str, active_processes: dict[str, ProcessControlBlock]
) -> ProcessControlBlock:
    """Retrieves PCB for identifier, raising HTTPException 404 if not found."""
    pcb = active_processes.get(identifier)
    if pcb is None:
        logger.warning(
            f"Attempted to access non-existent identifier: {identifier}. Available identifiers: {list(active_processes.keys())}"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Process with identifier '{identifier}' not found.",
        )
    return pcb


async def run_process_core(
    run_request: RunRequest, active_processes: dict[str, ProcessControlBlock]
) -> RunResponse:
    """
    Core function that contains the logic for starting a process.
    """
    identifier = run_request.identifier

    logger.info(
        f"Processing run request: identifier='{identifier}', command='{run_request.command_str}', env_keys={list(run_request.env.keys()) if run_request.env else 'None'}, stdin_commands={len(run_request.stdin_commands) if run_request.stdin_commands else 'None'}"
    )

    # Check if there's an existing process with this identifier
    if identifier in active_processes:
        old_pcb = active_processes[identifier]
        logger.info(
            f"Found existing process with identifier {identifier}. Cleaning up..."
        )
        await old_pcb.kill()
        # Remove the old PCB from active_processes
        del active_processes[identifier]
        logger.info(
            f"Removed old PCB from active_processes for identifier={identifier}"
        )

    # Create new PCB instance
    pcb = ProcessControlBlock(
        identifier=identifier,
        command_str=run_request.command_str,
        env=run_request.env,
        cwd=run_request.cwd,
    )

    # Add the PCB to active_processes immediately so it can be accessed even if start fails
    logger.info(f"Adding PCB to active_processes for identifier={identifier}")
    active_processes[identifier] = pcb
    logger.info(
        f"Successfully added PCB to active_processes for identifier={identifier}"
    )

    try:
        await pcb.start()  # Asynchronously start the process

        # If stdin commands were provided, send them to the process
        if run_request.stdin_commands:
            for command in run_request.stdin_commands:
                try:
                    success = await pcb.send_stdin(command)
                    if not success:
                        logger.warning(
                            f"Failed to send stdin command '{command}' to identifier={identifier}"
                        )
                except Exception as stdin_err:
                    logger.error(
                        f"Error sending stdin command '{command}' to identifier={identifier}: {str(stdin_err)}"
                    )
                    raise
    except Exception as e:
        logger.error(
            f"Error starting process for identifier={identifier}: {str(e)}",
            exc_info=True,
        )
        # Keep the PCB in active_processes even if start failed so it can be inspected
        initial_status = (
            pcb._status.value
        )  # Access internal status directly if start failed.
        if initial_status != ProcessStatus.ERROR_START.value:  # Defensive
            initial_status = ProcessStatus.ERROR_START.value
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start process {identifier}: {str(e)}",
        )

    initial_status = await pcb.get_status()  # Get status after start
    logger.info(
        f"Created process: identifier={identifier}, pid={pcb.pid}, status={initial_status}"
    )

    # Return basic info about the started run
    return RunResponse(identifier=identifier, pid=pcb.pid, status=initial_status)


@router.post(
    "/run",
    response_model=RunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new process",
    description="Creates a new process run based on the provided command string, identifier, and optional environment variables. If a process with the same identifier already exists, it will be terminated and replaced.",
)
async def run_process(
    run_request: RunRequest,
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to initiate a new background process.
    If a process with the same identifier already exists, it will be killed and replaced.
    """
    logger.info(f"Received /run request: identifier='{run_request.identifier}'")
    return await run_process_core(run_request, active_processes)


@router.post(
    "/stdin/{identifier}",
    response_model=StdinResponse,
    summary="Send data to process stdin",
    description="Sends data to the standard input of a running process.",
)
async def send_stdin(
    identifier: str = Path(..., description="The identifier of the process."),
    stdin_request: StdinRequest = ...,
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to send data to a process's standard input.
    """
    logger.info(
        f"Received /stdin request for identifier={identifier}, data length={len(stdin_request.data)}"
    )
    pcb = get_pcb_or_404(identifier, active_processes)

    try:
        success = await pcb.send_stdin(stdin_request.data)
        if success:
            logger.info(f"Successfully sent data to stdin for identifier={identifier}")
            return StdinResponse(identifier=identifier, success=True)
        else:
            error_msg = f"Failed to send data to stdin for identifier={identifier}"
            logger.warning(error_msg)
            return StdinResponse(identifier=identifier, success=False, error=error_msg)
    except RuntimeError as e:
        error_msg = f"Cannot send data to stdin: {str(e)}"
        logger.warning(f"{error_msg} for identifier={identifier}")
        return StdinResponse(identifier=identifier, success=False, error=error_msg)
    except Exception as e:
        error_msg = f"Error sending data to stdin: {str(e)}"
        logger.error(f"{error_msg} for identifier={identifier}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )


@router.get(
    "/tail/stdout/{identifier}",
    response_model=LogLinesResponse,
    summary="Tail stdout lines",
    description="Reads the last N lines from the stdout log file.",
)
async def tail_stdout_lines(
    identifier: str = Path(..., description="The identifier of the process."),
    lines: int = Query(
        10,
        ge=1,
        le=100,
        description="Maximum number of lines to return from the end of stdout.",
    ),
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to read the last lines from stdout.
    Uses the PCB's async `tail_stdout` method.
    """
    logger.info(
        f"Received /tail/stdout request: identifier={identifier}, lines={lines}"
    )
    pcb = get_pcb_or_404(identifier, active_processes)

    try:
        log_lines = await pcb.tail_stdout(lines)
        logger.debug(
            f"Tail stdout successful for identifier={identifier}, read {len(log_lines)} lines."
        )
        return LogLinesResponse(
            identifier=identifier, lines=log_lines, lines_read_count=len(log_lines)
        )
    except ValueError as ve:
        logger.warning(
            f"Validation error during tail stdout for identifier={identifier}: {ve}"
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(
            f"Error during tail stdout for identifier={identifier}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to tail stdout: {str(e)}",
        )


@router.get(
    "/tail/stderr/{identifier}",
    response_model=LogLinesResponse,
    summary="Tail stderr lines",
    description="Reads the last N lines from the stderr log file.",
)
async def tail_stderr_lines(
    identifier: str = Path(..., description="The identifier of the process."),
    lines: int = Query(
        10,
        ge=1,
        le=100,
        description="Maximum number of lines to return from the end of stderr.",
    ),
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to read the last lines from stderr.
    Uses the PCB's async `tail_stderr` method.
    """
    logger.info(
        f"Received /tail/stderr request: identifier={identifier}, lines={lines}"
    )
    pcb = get_pcb_or_404(identifier, active_processes)

    try:
        log_lines = await pcb.tail_stderr(lines)
        logger.debug(
            f"Tail stderr successful for identifier={identifier}, read {len(log_lines)} lines."
        )
        return LogLinesResponse(
            identifier=identifier, lines=log_lines, lines_read_count=len(log_lines)
        )
    except ValueError as ve:
        logger.warning(
            f"Validation error during tail stderr for identifier={identifier}: {ve}"
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(
            f"Error during tail stderr for identifier={identifier}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to tail stderr: {str(e)}",
        )


@router.get(
    "/stdout/{identifier}",
    response_model=LogLinesResponse,
    summary="Read stdout lines incrementally",
    description="Reads up to N complete lines from the stdout log file, advancing the internal read cursor.",
)
async def read_stdout_lines(
    identifier: str = Path(..., description="The identifier of the process."),
    lines: int = Query(
        10, ge=1, le=100, description="Maximum number of complete lines to read."
    ),
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to read a chunk of stdout lines from a specific process.
    Uses the PCB's async `read_stdout_lines` method.
    """
    logger.info(f"Received /stdout request: identifier={identifier}, lines={lines}")
    pcb = get_pcb_or_404(identifier, active_processes)

    try:
        log_lines = await pcb.read_stdout_lines(lines)
        logger.debug(
            f"Read stdout successful for identifier={identifier}, read {len(log_lines)} lines."
        )
        return LogLinesResponse(
            identifier=identifier, lines=log_lines, lines_read_count=len(log_lines)
        )
    except ValueError as ve:
        logger.warning(
            f"Validation error during read stdout for identifier={identifier}: {ve}"
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(
            f"Error during read stdout for identifier={identifier}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read stdout: {str(e)}",
        )


@router.get(
    "/stderr/{identifier}",
    response_model=LogLinesResponse,
    summary="Read stderr lines incrementally",
    description="Reads up to N complete lines from the stderr log file, advancing the internal read cursor.",
)
async def read_stderr_lines(
    identifier: str = Path(..., description="The identifier of the process."),
    lines: int = Query(
        10, ge=1, le=100, description="Maximum number of complete lines to read."
    ),
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to read a chunk of stderr lines from a specific process.
    Uses the PCB's async `read_stderr_lines` method.
    """
    logger.info(f"Received /stderr request: identifier={identifier}, lines={lines}")
    pcb = get_pcb_or_404(identifier, active_processes)

    try:
        log_lines = await pcb.read_stderr_lines(lines)
        logger.debug(
            f"Read stderr successful for identifier={identifier}, read {len(log_lines)} lines."
        )
        return LogLinesResponse(
            identifier=identifier, lines=log_lines, lines_read_count=len(log_lines)
        )
    except ValueError as ve:
        logger.warning(
            f"Validation error during read stderr for identifier={identifier}: {ve}"
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(
            f"Error during read stderr for identifier={identifier}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read stderr: {str(e)}",
        )


@router.delete(
    "/terminate/{identifier}",
    response_model=TerminateResponse,
    summary="Terminate a process",
    description="Attempts to terminate (SIGTERM) and then kill (SIGKILL) the specified process. Returns the final status.",
)
async def terminate_process(
    identifier: str = Path(
        ..., description="The identifier of the process to terminate."
    ),
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to stop a running process. Uses the PCB's async `kill` method.
    Then fetches the final status.
    """
    logger.info(f"Received /terminate request: identifier={identifier}")
    pcb = get_pcb_or_404(identifier, active_processes)

    try:
        await pcb.kill()  # Call the async method directly
        logger.info(f"Kill sequence completed for identifier={identifier}")

        # Get the final status after the kill attempt
        final_status = await pcb.get_status()  # Call the async method directly
        logger.info(
            f"Final status for identifier={identifier} after termination: {final_status}"
        )

        return TerminateResponse(identifier=identifier, status=final_status)
    except Exception as e:
        logger.error(
            f"Error during termination for identifier={identifier}: {e}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to terminate process: {str(e)}",
        )


@router.get(
    "/processes",
    response_model=list[RunInfo],
    summary="List all processes",
    description="Retrieves a list of all tracked process runs (running, finished, terminated, etc.) with summary information, including environment variables.",
)
async def list_processes(
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to list all currently tracked processes. Retrieves status and basic info
    using async PCB methods.
    """
    logger.info("Received /processes request")
    results: list[RunInfo] = []

    # Create a shallow copy of items if planning to remove during iteration (not the case here)
    # active_processes.values() gives a view, so iterating over a list copy is safer if modifications could occur
    # For read-only purposes like this, iterating directly is fine, but defensive copy is good practice.
    items_copy = list(active_processes.values())
    logger.info(f"Processing {len(items_copy)} tracked processes.")

    for pcb in items_copy:
        try:
            logger.debug(f"Getting status for identifier={pcb.identifier}")
            current_status = await pcb.get_status()  # Async call
            logger.debug(
                f"Got status for identifier={pcb.identifier}: {current_status}"
            )

            # Convert timestamps to ISO format strings
            start_time_str = (
                datetime.fromtimestamp(pcb.start_time).isoformat()
                if pcb.start_time
                else "N/A"
            )
            end_time_str = (
                datetime.fromtimestamp(pcb.end_time).isoformat()
                if pcb.end_time
                else None
            )

            # PCB stores env as self.custom_env, ensure RunInfo expects this or adapt
            run_info = RunInfo(
                identifier=pcb.identifier,
                command_str=pcb.command_str,
                env=pcb.custom_env,  # PCB stores custom env in self.custom_env
                start_time=start_time_str,
                end_time=end_time_str,
                status=current_status,
            )
            results.append(run_info)
            logger.debug(f"Added identifier={pcb.identifier} to results")
        except Exception as e:
            logger.error(
                f"Error processing identifier={pcb.identifier} for /processes list: {e}",
                exc_info=True,
            )
            # Optionally include errored processes in the list with an error indicator
            # For now, we skip them if there's an error fetching their info.

    # Sort results, e.g., by start time descending (most recent first)
    logger.info(
        f"Sorting {len(results)} process run summaries by start time descending"
    )
    results.sort(key=lambda x: x.start_time, reverse=True)
    logger.info(f"Returning {len(results)} process run summaries.")
    return results


@router.get(
    "/inspect/{identifier}",
    response_model=ProcessStats,
    summary="Inspect process by identifier",
    description="Retrieves detailed statistics for a specific process using its identifier.",
)
async def inspect_process(
    identifier: str = Path(
        ..., description="The identifier of the process to inspect."
    ),
    active_processes: dict[str, ProcessControlBlock] = Depends(get_active_processes),
):
    """
    Endpoint to get detailed statistics for a specific process.
    Uses the PCB's async `get_stats` method.
    """
    logger.info(f"Received /inspect request for identifier: {identifier}")
    pcb = get_pcb_or_404(identifier, active_processes)

    try:
        stats_dict = await pcb.get_stats()  # Call the async method directly

        if stats_dict:
            # Convert create_time to ISO format string if it exists
            if "create_time" in stats_dict and stats_dict["create_time"] is not None:
                stats_dict["create_time"] = datetime.fromtimestamp(
                    stats_dict["create_time"]
                ).isoformat()

            logger.info(f"Successfully retrieved stats for identifier={identifier}")
            return ProcessStats(identifier=identifier, **stats_dict)
        else:
            # This case should ideally be handled by pcb.get_stats() returning a dict with an error
            logger.error(
                f"Stats dictionary was unexpectedly None or empty for identifier={identifier}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not retrieve valid stats dictionary for identifier={identifier}. Process might not be running or stats unavailable.",
            )
    except Exception as e:
        logger.error(
            f"Error getting stats for identifier={identifier}: {e}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve stats: {str(e)}",
        )
