from typing import Callable

from openfoundry.agents.streamlit_app_coding_agent import get_streamlit_app_coding_agent

NAME_TO_AGENT_FACTORY: dict[str, Callable] = {
    "streamlit_app_coding_agent": get_streamlit_app_coding_agent,
}
