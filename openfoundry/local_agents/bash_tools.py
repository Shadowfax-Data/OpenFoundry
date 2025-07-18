"""Bash command execution and process management tools for AI agents in the OpenFoundry platform.

This module contains tools for executing bash commands, managing processes,
and monitoring their execution within the sandbox environment.
"""

import asyncio
import shlex
from typing import Any

from agents import RunContextWrapper, function_tool

from openfoundry.local_agents.run_context import AgentRunContext
from openfoundry.local_agents.utils.format_utils import dict_to_xml, truncate
from openfoundry.local_agents.utils.process_utils import (
    DEFAULT_POLL_INTERVAL_SECONDS,
    DEFAULT_WAIT_TIMEOUT_SECONDS,
    get_process_logs,
    poll_process_status,
)


@function_tool
async def run_shell_command(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    identifier: str,
    command: str,
    working_directory: str = "/workspace",
    stdin_commands: list[str] | None = None,
):
    """Run command(s) in a bash shell. The command will return information about the launched process.

    The command is automatically wrapped in 'bash -c' to handle shell features.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        identifier: Unique identifier for this command execution.
        command: The shell command to execute.
        working_directory: Working directory for the command.
        stdin_commands: Optional list of strings to send to the command's stdin after starting.

    Returns:
        Initial status information about the started process.

    """
    # Wrap in bash -c to handle shell features
    bash_command = f"bash -c {shlex.quote(command)}"

    async with wrapper.context.get_sandbox_client() as client:
        payload: dict[str, Any] = {
            "identifier": identifier,
            "command_str": bash_command,
            "cwd": working_directory,
        }
        if stdin_commands is not None:
            payload["stdin_commands"] = stdin_commands

        response = await client.post("/run", json=payload)
        if response.is_error:
            raise Exception(f"Failed to run shell command: {response.text}")

        run_result = response.json()

        # Wait a bit to get information about the process logs
        status_info = await poll_process_status(
            client,
            identifier,
            DEFAULT_WAIT_TIMEOUT_SECONDS,
            DEFAULT_POLL_INTERVAL_SECONDS,
        )

        # Retrieve the logs of the process concurrently
        stdout_response, stderr_response = await asyncio.gather(
            get_process_logs(client, identifier, "stdout", 100),
            get_process_logs(client, identifier, "stderr", 100),
        )

        # Truncate stdout and stderr lines to prevent token overflow
        truncated_stdout = [truncate(line) for line in stdout_response["lines"]]
        truncated_stderr = [truncate(line) for line in stderr_response["lines"]]

        return dict_to_xml(
            {
                "note": f"Executed shell command: {command}",
                "identifier": identifier,
                "pid": run_result["pid"],
                "status": status_info["status"],
                "stdout": truncated_stdout,
                "stderr": truncated_stderr,
            }
        )


@function_tool
async def send_stdin(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    identifier: str,
    data: str,
):
    r"""Send input data to a running process's stdin.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        identifier: The identifier of the running process.
        data: The data to send to stdin (include \\n for line endings if needed).

    Returns:
        Success status and any error information.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.post(
            f"/stdin/{identifier}",
            json={"data": data},
        )
        if response.is_error:
            raise Exception(f"Failed to send stdin: {response.text}")

        result = response.json()
        return dict_to_xml(
            {
                "identifier": result["identifier"],
                "success": result["success"],
                "error": result.get("error"),
            }
        )


@function_tool
async def tail_process_logs(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    identifier: str,
    lines: int = 10,
):
    """Get the most recent lines from a process's output logs from both stdout and stderr.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        identifier: The identifier of the process.
        lines: Number of lines to return from the end of each stream (1-100, default 10).

    Returns:
        The most recent log lines from both stdout and stderr streams.

    """
    async with wrapper.context.get_sandbox_client() as client:
        # Retrieve the logs from both streams concurrently
        stdout_response, stderr_response = await asyncio.gather(
            get_process_logs(client, identifier, "stdout", lines),
            get_process_logs(client, identifier, "stderr", lines),
        )

        # Truncate stdout and stderr lines to prevent token overflow
        truncated_stdout = [truncate(line) for line in stdout_response["lines"]]
        truncated_stderr = [truncate(line) for line in stderr_response["lines"]]

        return dict_to_xml(
            {
                "identifier": identifier,
                "stdout": truncated_stdout,
                "stderr": truncated_stderr,
                "stdout_lines_read_count": stdout_response["lines_read_count"],
                "stderr_lines_read_count": stderr_response["lines_read_count"],
            }
        )


@function_tool
async def read_process_logs(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    identifier: str,
    lines: int = 10,
):
    """Read the next batch of lines from a process's logs from both stdout and stderr, advancing the read cursor.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        identifier: The identifier of the process.
        lines: Number of lines to read from each stream (1-100, default 10).

    Returns:
        The next batch of log lines from both stdout and stderr streams.

    """
    async with wrapper.context.get_sandbox_client() as client:
        stdout_response = await client.get(
            f"/stdout/{identifier}",
            params={"lines": lines},
        )
        if stdout_response.is_error:
            raise Exception(f"Failed to read stdout logs: {stdout_response.text}")

        stderr_response = await client.get(
            f"/stderr/{identifier}",
            params={"lines": lines},
        )
        if stderr_response.is_error:
            raise Exception(f"Failed to read stderr logs: {stderr_response.text}")

        stdout_result = stdout_response.json()
        stderr_result = stderr_response.json()

        # Truncate stdout and stderr lines to prevent token overflow
        truncated_stdout = [truncate(line) for line in stdout_result["lines"]]
        truncated_stderr = [truncate(line) for line in stderr_result["lines"]]

        return dict_to_xml(
            {
                "identifier": identifier,
                "stdout": truncated_stdout,
                "stderr": truncated_stderr,
                "stdout_lines_read_count": stdout_result["lines_read_count"],
                "stderr_lines_read_count": stderr_result["lines_read_count"],
            }
        )


@function_tool
async def terminate_process(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    identifier: str,
):
    """Terminate a running process.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        identifier: The identifier of the process to terminate.

    Returns:
        Final status of the process after termination.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.delete(f"/terminate/{identifier}")
        if response.is_error:
            raise Exception(f"Failed to terminate process: {response.text}")

        result = response.json()
        return dict_to_xml(
            {"identifier": result["identifier"], "status": result["status"]}
        )


@function_tool
async def list_processes(wrapper: RunContextWrapper[AgentRunContext], thought: str):
    """List all currently tracked processes.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.

    Returns:
        Information about all running, finished, and terminated processes.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.get("/processes")
        if response.is_error:
            raise Exception(f"Failed to list processes: {response.text}")

        processes = response.json()
        return dict_to_xml({"processes": processes})


@function_tool
async def wait_for_process(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    identifier: str,
    wait_seconds: int = DEFAULT_WAIT_TIMEOUT_SECONDS,
):
    """Wait for a process to finish by polling its status until it reaches a terminal state.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        identifier: The identifier of the process to wait for.
        wait_seconds: Maximum number of seconds to wait for the process to finish.

    Returns:
        The final status information of the process with log tails from both stdout and stderr.

    """
    async with wrapper.context.get_sandbox_client() as client:
        result = await poll_process_status(
            client, identifier, wait_seconds, DEFAULT_POLL_INTERVAL_SECONDS
        )

        # Retrieve the logs from both streams concurrently
        stdout_response, stderr_response = await asyncio.gather(
            get_process_logs(client, identifier, "stdout", 10),
            get_process_logs(client, identifier, "stderr", 10),
        )

        # Truncate stdout and stderr lines to prevent token overflow
        truncated_stdout = [truncate(line) for line in stdout_response["lines"]]
        truncated_stderr = [truncate(line) for line in stderr_response["lines"]]

        # Add log information to the result
        result.update(
            {
                "stdout": truncated_stdout,
                "stderr": truncated_stderr,
                "stdout_lines_read_count": stdout_response["lines_read_count"],
                "stderr_lines_read_count": stderr_response["lines_read_count"],
            }
        )
        return dict_to_xml(result)
