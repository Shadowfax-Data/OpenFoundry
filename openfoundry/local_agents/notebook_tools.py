"""Notebook-specific function tools for Jupyter notebook operations in OpenFoundry.

This module contains tools for executing cells, running all cells, stopping execution,
and deleting cells within a Jupyter notebook environment.
"""

import uuid

from agents import RunContextWrapper, function_tool

from openfoundry.local_agents.run_context import AgentRunContext
from openfoundry.local_agents.utils.format_utils import dict_to_xml


@function_tool
async def execute_cell(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    code: str,
    cell_id: str | None = None,
):
    """Execute code in a Jupyter notebook cell.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        code: Python code to execute in the cell.
        cell_id: Optional unique identifier for the cell. If not provided, a new cell ID will be generated.

    Returns:
        Execution status and any immediate results. Note that for streaming execution,
        full results may arrive asynchronously.

    """
    # Generate a new cell ID if none provided
    if cell_id is None:
        cell_id = str(uuid.uuid4())

    async with wrapper.context.get_sandbox_client() as client:
        response = await client.post(
            "/api/notebook/execute/stream",
            json={"code": code, "cell_id": cell_id},
        )
        if response.is_error:
            raise Exception(f"Failed to execute cell: {response.text}")

        return f"Started executing cell {cell_id}. Code execution initiated with streaming output."


@function_tool
async def get_notebook(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
):
    """Get the complete notebook data including all cells, their outputs, and execution results.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.

    Returns:
        Complete notebook data with all cells, source code, outputs, execution counts, and cell metadata.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.get("/api/notebook/notebook")
        if response.is_error:
            raise Exception(f"Failed to get notebook: {response.text}")

        notebook_data = response.json()

        # Format the notebook data for better readability
        if "cells" in notebook_data:
            formatted_cells = []
            for i, cell in enumerate(notebook_data["cells"]):
                cell_info = {
                    "cell_index": i,
                    "cell_id": cell.get("id", "unknown"),
                    "cell_type": cell.get("cell_type", "unknown"),
                    "source": cell.get("source", ""),
                    "execution_count": cell.get("execution_count"),
                }

                # Include outputs if they exist
                if cell.get("outputs"):
                    cell_info["outputs"] = cell["outputs"]

                formatted_cells.append(cell_info)

            return dict_to_xml(
                {
                    "notebook_metadata": notebook_data.get("metadata", {}),
                    "total_cells": len(notebook_data["cells"]),
                    "cells": formatted_cells,
                }
            )

        return dict_to_xml(notebook_data)


@function_tool
async def run_all_cells(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
):
    """Re-run all cells in the notebook in order.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.

    Returns:
        Status of the run-all operation with streaming execution details.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.post("/api/notebook/rerun")
        if response.is_error:
            raise Exception(f"Failed to run all cells: {response.text}")

        return "Started re-running all cells in the notebook with streaming output."


@function_tool
async def stop_cell(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    cell_id: str | None = None,
):
    """Stop/interrupt currently executing cell(s).

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        cell_id: Optional specific cell ID to stop. If not provided, stops any currently executing cell.

    Returns:
        Result of the stop operation including success status and message.

    """
    async with wrapper.context.get_sandbox_client() as client:
        request_data = {}
        if cell_id is not None:
            request_data["cell_id"] = cell_id

        response = await client.post("/api/notebook/stop", json=request_data)
        if response.is_error:
            raise Exception(f"Failed to stop cell execution: {response.text}")

        result = response.json()
        return dict_to_xml(result)


@function_tool
async def delete_cell(
    wrapper: RunContextWrapper[AgentRunContext],
    thought: str,
    cell_id: str,
):
    """Delete a cell from the notebook by its ID.

    Args:
        wrapper: The agent run context wrapper for accessing sandbox client.
        thought: Your thought process for using this tool. It will be displayed in the chat to the user. Talk in first person and present reasoning as to why you are using this tool.
        cell_id: Unique identifier of the cell to delete.

    Returns:
        Result of the deletion operation including success status and message.

    """
    async with wrapper.context.get_sandbox_client() as client:
        response = await client.delete(f"/api/notebook/cells/{cell_id}")
        if response.is_error:
            raise Exception(f"Failed to delete cell: {response.text}")

        result = response.json()
        return dict_to_xml(result)
