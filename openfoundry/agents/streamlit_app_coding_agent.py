import asyncio

from agents import Agent, ModelSettings, RunConfig
from agents.items import TResponseStreamEvent
from openai.types.shared.reasoning import Reasoning

from openfoundry.agents.common_tools import list_files, read_file, write_file
from openfoundry.agents.run_context import AppAgentRunContext


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
    """

    return Agent(
        name="streamlit_app_coding_agent",
        instructions=instructions,
        tools=[
            write_file,
            read_file,
            list_files,
        ],
        model="o4-mini",
        model_settings=ModelSettings(
            parallel_tool_calls=False,
            reasoning=Reasoning(
                effort="high",
                summary="auto",
            ),
        ),
    )
