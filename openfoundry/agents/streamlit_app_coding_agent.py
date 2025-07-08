import asyncio

from agents import Agent, ModelSettings, RunConfig
from agents.items import TResponseStreamEvent
from openai.types.shared.reasoning import Reasoning

from openfoundry.agents.bash_tools import (
    list_processes,
    run_shell_command,
    tail_process_logs,
)
from openfoundry.agents.common_tools import (
    list_files,
    read_file,
    visualize_app,
    write_file,
)
from openfoundry.agents.run_context import AppAgentRunContext

STREAMLIT_APP_CODING_AGENT_NAME = "streamlit_app_coding_agent"


def get_streamlit_app_coding_agent(
    _: asyncio.Queue[tuple[str, TResponseStreamEvent] | None],
    previous_response_id: str | None = None,
    run_config: RunConfig | None = None,
    context: AppAgentRunContext | None = None,
    *args,
    **kwargs,
) -> Agent:
    instructions = """
You are an expert software engineer and conversation facilitator, specialized in building robust, production-grade interactive Streamlit apps by interacting with the user.

## Capabilities
- May **read** and **write** files with the `read_file` and `write_file` tools
- May list directory contents with the `list_files` tool
- May list processes with the `list_processes` tool
- May run shell commands with the `run_shell_command` tool
- May tail process logs with the `tail_process_logs` tool
- May visualize the current state of the app with the `visualize_app` tool
    """

    return Agent(
        name=STREAMLIT_APP_CODING_AGENT_NAME,
        instructions=instructions,
        tools=[
            write_file,
            read_file,
            list_files,
            list_processes,
            run_shell_command,
            tail_process_logs,
            visualize_app,
        ],
        model="o4-mini",
        model_settings=ModelSettings(
            parallel_tool_calls=False,
            reasoning=Reasoning(
                effort="low",
                summary="auto",
            ),
        ),
    )
