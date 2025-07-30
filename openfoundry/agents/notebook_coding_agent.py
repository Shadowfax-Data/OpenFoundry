from agents import Agent, ModelSettings

from openfoundry.agents.notebook_tools import (
    delete_cell,
    execute_cell,
    get_notebook,
    run_all_cells,
    stop_cell,
    tail_cells,
)
from openfoundry.agents.utils.template_loader import load_prompt_template

NOTEBOOK_CODING_AGENT_NAME = "notebook_coding_agent"


def get_notebook_coding_agent(
    model: str,
    model_settings: ModelSettings,
) -> Agent:
    template_name = "notebooks/notebook_coding_agent.j2"
    selected_prompt = load_prompt_template(template_name)

    return Agent(
        name=NOTEBOOK_CODING_AGENT_NAME,
        instructions=selected_prompt,
        tools=[
            execute_cell,
            get_notebook,
            run_all_cells,
            stop_cell,
            delete_cell,
            tail_cells,
        ],
        model=model,
        model_settings=model_settings,
    )
