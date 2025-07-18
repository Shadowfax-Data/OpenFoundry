from agents import Agent, ModelSettings

from openfoundry.local_agents.bash_tools import (
    list_processes,
    tail_process_logs,
)
from openfoundry.local_agents.common_tools import (
    execute_sql,
    list_connections,
    list_files,
    read_file,
    write_file,
)
from openfoundry.local_agents.utils.template_loader import load_prompt_template

STREAMLIT_APP_CODING_AGENT_NAME = "streamlit_app_coding_agent"


def get_streamlit_app_coding_agent(
    model: str,
    model_settings: ModelSettings,
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
        model=model,
        model_settings=model_settings,
    )
