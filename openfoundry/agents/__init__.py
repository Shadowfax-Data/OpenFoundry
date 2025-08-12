from typing import Callable

from agents import ModelSettings
from openai.types.shared.reasoning import Reasoning

from openfoundry.agents.notebook_coding_agent import get_notebook_coding_agent
from openfoundry.agents.streamlit_app_coding_agent import (
    get_streamlit_app_coding_agent,
)

NAME_TO_AGENT_FACTORY: dict[str, Callable] = {
    "streamlit_app_coding_agent": get_streamlit_app_coding_agent,
    "notebook_coding_agent": get_notebook_coding_agent,
}


TEMPERATURE = 0.5
MODEL_CONFIGS = {
    "gpt-5 thinking": (
        "gpt-5",
        ModelSettings(
            parallel_tool_calls=False,
            reasoning=Reasoning(
                effort="high",
                summary="auto",
            ),
        ),
    ),
    "gpt-5": (
        "gpt-5",
        ModelSettings(
            parallel_tool_calls=False,
            reasoning=Reasoning(
                effort="minimal",
                summary="auto",
            ),
        ),
    ),
    "gpt-5 mini": (
        "gpt-5-mini",
        ModelSettings(
            parallel_tool_calls=False,
            reasoning=Reasoning(
                effort="high",
                summary="auto",
            ),
        ),
    ),
    "o4-mini": (
        "o4-mini",
        ModelSettings(
            parallel_tool_calls=False,
            reasoning=Reasoning(
                effort="high",
                summary="auto",
            ),
        ),
    ),
    "gpt-4.1": (
        "gpt-4.1",
        ModelSettings(
            parallel_tool_calls=False,
            temperature=TEMPERATURE,
        ),
    ),
    "o3": (
        "o3",
        ModelSettings(
            parallel_tool_calls=False,
            reasoning=Reasoning(
                effort="high",
                summary="auto",
            ),
        ),
    ),
}


def get_model_name_and_settings(model: str | None) -> tuple[str, ModelSettings]:
    return MODEL_CONFIGS[model or "gpt-5 thinking"]
