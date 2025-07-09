"""Template loader utility for agent prompts."""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader


def load_prompt_template(template_name: str, **context) -> str:
    """Load and render a prompt template with optional context variables.

    Args:
        template_name: Path to the template file (e.g., 'apps/streamlit_app_coding_agent.j2')
        **context: Variables to pass to the template for rendering

    Returns:
        Rendered template as a string

    """
    # Get the path to the templates directory
    current_dir = Path(__file__).parent
    templates_dir = current_dir.parent / "templates"

    # Create Jinja2 environment
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        trim_blocks=True,
        lstrip_blocks=True,
    )

    template = env.get_template(template_name)
    return template.render(**context)
