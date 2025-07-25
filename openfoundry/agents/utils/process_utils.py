import asyncio
import time

# Terminal statuses where a process has finished executing
TERMINAL_PROCESS_STATUSES = {
    "finished_ok",
    "finished_error",
    "terminated",
    "error_start",
    "error_terminate",
    "unknown",
}

# Default polling and timeout constants
DEFAULT_POLL_INTERVAL_SECONDS = 1.0
DEFAULT_DEBUG_POLL_INTERVAL_SECONDS = 10.0
DEFAULT_WAIT_TIMEOUT_SECONDS = 5
DEFAULT_DEBUG_TIMEOUT_SECONDS = 300


async def poll_process_status(
    client,
    identifier: str,
    timeout_seconds: int,
    poll_interval_seconds: float = DEFAULT_POLL_INTERVAL_SECONDS,
) -> dict:
    """Poll a process status until it reaches a terminal state or times out.

    Args:
        client: HTTP client to use for requests
        identifier: Process identifier to poll
        timeout_seconds: Maximum time to wait in seconds
        poll_interval_seconds: Time between polling attempts

    Returns:
        Final status info dict if process finished, None if timed out

    """
    timeout_time = time.monotonic() + timeout_seconds
    last_status_info = {"status": "unknown"}

    while time.monotonic() < timeout_time:
        response = await client.get(f"/inspect/{identifier}")
        response.raise_for_status()
        status_info = response.json()
        last_status_info = status_info

        current_status = status_info.get("status", "unknown")

        # Check if process has reached a terminal state
        if current_status in TERMINAL_PROCESS_STATUSES:
            return status_info

        # Wait before next poll
        await asyncio.sleep(poll_interval_seconds)

    # Timeout reached - return the last known status_info
    return last_status_info


async def get_process_logs(client, identifier: str, stream: str, lines: int) -> dict:
    """Get logs from a process stream.

    Args:
        client: HTTP client to use for requests
        identifier: Process identifier
        stream: Which stream to read from ('stdout' or 'stderr')
        lines: Number of lines to return

    Returns:
        JSON response from the log endpoint

    """
    if stream not in ["stdout", "stderr"]:
        raise ValueError("stream must be either 'stdout' or 'stderr'")

    response = await client.get(f"/tail/{stream}/{identifier}", params={"lines": lines})
    response.raise_for_status()
    return response.json()
