import asyncio

from agents import Agent, ModelSettings, RunConfig
from agents.items import TResponseStreamEvent
from openai.types.shared.reasoning import Reasoning

from openfoundry.agents.bash_tools import (
    list_processes,
    tail_process_logs,
)
from openfoundry.agents.common_tools import (
    execute_sql,
    list_connections,
    list_files,
    read_file,
    write_file,
)
from openfoundry.agents.run_context import AppAgentRunContext
from openfoundry.agents.utils.template_loader import load_prompt_template

STREAMLIT_APP_CODING_AGENT_NAME = "streamlit_app_coding_agent"


def get_streamlit_app_coding_agent(
    _: asyncio.Queue[tuple[str, TResponseStreamEvent] | None],
    previous_response_id: str | None = None,
    run_config: RunConfig | None = None,
    context: AppAgentRunContext | None = None,
    *args,
    **kwargs,
) -> Agent:
    template_name = "apps/streamlit_app_coding_agent.j2"
    selected_prompt = load_prompt_template(template_name)

    return Agent(
        name=STREAMLIT_APP_CODING_AGENT_NAME,
        instructions=selected_prompt,
        tools=[
            write_file,
            read_file,
            list_files,
            list_processes,
            tail_process_logs,
            list_connections,
            execute_sql,
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
