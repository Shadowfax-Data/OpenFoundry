"""Shared function tools used by multiple agents in the OpenFoundry platform.

This module contains common tools for file operations and workspace management
that are used across different agent implementations.
"""

from agents import RunContextWrapper, function_tool

from openfoundry.agents.run_context import AgentRunContext
from openfoundry.agents.utils.format_utils import dict_to_xml, truncate


@function_tool
async def write_file(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    absolute_file_path: str,
    content: str,
):
    """Write content to a file at the specified absolute path (e.g. /workspace/main.py).

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        absolute_file_path: The absolute path to the file to write to. Must start with /workspace.
        content: The content to write to the file.

    """
    if not absolute_file_path.startswith("/workspace"):
        raise ValueError(
            f"Access denied: File path {absolute_file_path} is outside the allowed /workspace directory"
        )

    async with wrapper.context.get_sandbox_client() as client:
        response = await client.post(
            "/write_file",
            json={"file_path": absolute_file_path, "content": content},
        )
        if response.is_error:
            raise Exception(f"Failed to write to {absolute_file_path}: {response.text}")

        return f"Successfully wrote to {absolute_file_path}"


@function_tool
async def read_file(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    absolute_file_path: str,
):
    """Read content from a file at the specified absolute path (e.g. /workspace/main.py).

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        absolute_file_path: The absolute path to the file to read from. Must start with /workspace.

    """
    if not absolute_file_path.startswith("/workspace"):
        raise ValueError(
            f"Access denied: File path {absolute_file_path} is outside the allowed /workspace directory"
        )

    async with wrapper.context.get_sandbox_client() as client:
        response = await client.get(
            "/read_file",
            params={"file_path": absolute_file_path},
        )
        if response.is_error:
            raise Exception(
                f"Failed to read from {absolute_file_path}: {response.text}"
            )

        return truncate(response.json()["content"])


@function_tool
async def str_replace_editor(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    command: str,
    path: str,
    file_text: str | None = None,
    old_str: str | None = None,
    new_str: str | None = None,
    insert_line: int | None = None,
    view_range: list[int] | None = None,
):
    """Custom editing tool for viewing, creating and editing files in plain-text format.

    * State is persistent across command calls and discussions with the user
    * If `path` is a text file, `view` displays the result of applying `cat -n`. If `path` is a directory, `view` lists non-hidden files and directories up to 2 levels deep
    * The following binary file extensions can be viewed in Markdown format: [".xlsx", ".pptx", ".wav", ".mp3", ".m4a", ".flac", ".pdf", ".docx"]. IT DOES NOT HANDLE IMAGES.
    * The `create` command cannot be used if the specified `path` already exists as a file
    * If a `command` generates a long output, it will be truncated and marked with `<response clipped>`
    * The `undo_edit` command will revert the last edit made to the file at `path`
    * This tool can be used for creating and editing files in plain-text format.


    Before using this tool:
    1. Use the view tool to understand the file's contents and context
    2. Verify the directory path is correct (only applicable when creating new files):
    - Use the view tool to verify the parent directory exists and is the correct location

    When making edits:
    - Ensure the edit results in idiomatic, correct code
    - Do not leave the code in a broken state
    - Always use absolute file paths (starting with /)

    CRITICAL REQUIREMENTS FOR USING THIS TOOL:

    1. EXACT MATCHING: The `old_str` parameter must match EXACTLY one or more consecutive lines from the file, including all whitespace and indentation. The tool will fail if `old_str` matches multiple locations or doesn't match exactly with the file content.

    2. UNIQUENESS: The `old_str` must uniquely identify a single instance in the file:
    - Include sufficient context before and after the change point (3-5 lines recommended)
    - If not unique, the replacement will not be performed

    3. REPLACEMENT: The `new_str` parameter should contain the edited lines that replace the `old_str`. Both strings must be different.

    Remember: when making multiple file edits in a row to the same file, you should prefer to send all edits in a single message with multiple calls to this tool, rather than multiple messages with a single call each.


    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        command: The commands to run. Allowed options are: `view`, `create`, `str_replace`, `insert`, `undo_edit`.
        path: Absolute path to file or directory, e.g. `/workspace/file.py` or `/workspace`.
        file_text: Required parameter of `create` command, with the content of the file to be created.
        old_str: Required parameter of `str_replace` command containing the string in `path` to replace.
        new_str: Optional parameter of `str_replace` command containing the new string (if not given, no string will be added). Required parameter of `insert` command containing the string to insert.
        insert_line: Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.
        view_range: Optional parameter of `view` command when `path` points to a file. If none is given, the full file is shown. If provided, the file will be shown in the indicated line number range, e.g. [11, 12] will show lines 11 and 12. Indexing at 1 to start. Setting `[start_line, -1]` shows all lines from `start_line` to the end of the file.

    """
    if not path.startswith("/workspace"):
        raise ValueError(
            f"Access denied: Path {path} is outside the allowed /workspace directory"
        )

    async with wrapper.context.get_sandbox_client() as client:
        response = await client.post(
            "/str_replace_editor",
            json={
                "command": command,
                "path": path,
                "file_text": file_text,
                "old_str": old_str,
                "new_str": new_str,
                "insert_line": insert_line,
                "view_range": view_range,
            },
        )
        if response.is_error:
            raise Exception(f"Failed to execute editor command: {response.text}")

        response_data = response.json()
        if response_data.get("error"):
            return f"Encountered an error: {response_data['error']}"
        return response_data.get("output", "Command executed successfully.")


@function_tool
async def list_files(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
):
    """List all available files to the agent.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.get("/list_files")
        if response.is_error:
            raise Exception(f"Failed to list files: {response.text}")

        return response.json()["files"]


@function_tool
async def list_connections(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
):
    """List all available connections to the agent. The connection name and it's type will be returned.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.get("/connections/")
        if response.is_error:
            raise Exception(f"Failed to list connections: {response.text}")

        connections = response.json()
        if not connections:
            return "No connections found"
        return dict_to_xml(connections)


@function_tool
async def execute_sql(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    sql_statement: str,
    connection_name: str,
):
    """Execute a single SQL statement against the destination database.

    Before using this tool the agent MUST follow these steps in order:
    1.  Call the `list_connections` tool to retrieve the list of available connections.
    2.  Analyze the user's prompt to identify the most logical `connection_name` from the retrieved list.
    3.  Invoke this tool, passing the selected `connection_name` and the `sql_statement`.
    4.  If no suitable connection is found in step 1, the agent must inform the user and must NOT call this tool.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.

        thought: A first-person explanation of why you're running this SQL.
            This will be shown to the user in chat, so clearly explain your reasoning and intent.

        sql_statement: A single SQL statement to execute.
            Only one statement is allowed per call — for example:
            - SELECT * FROM customers WHERE country = 'US' LIMIT 100;
            - SHOW TABLES;
            - DESCRIBE orders;

        connection_name: The name of the target database connection.

            The statement must be read-only (e.g., SELECT, DESCRIBE, SHOW) unless the user
            has explicitly confirmed the action. Statements that modify the database
            (e.g., CREATE, DROP, DELETE, UPDATE) should not be executed without prior user confirmation.
            To prevent excessively large result sets, any SELECT statements must include LIMIT 100.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.post(
            "/execute_sql",
            json={"sql_statement": sql_statement, "connection_name": connection_name},
        )
        if response.is_error:
            raise Exception(f"Failed to execute SQL: {response.text}")

        return dict_to_xml(response.json())


@function_tool
async def visualize_app(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
):
    """Visualize the current state of the app.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.post("/visualize_app")
        if response.is_error:
            raise Exception(f"Failed to visualize app: {response.text}")

        return response.json()["content"]
