import os
from pathlib import Path

"""Configuration constants for the OpenFoundry sandbox."""

# Workspace directory path
WORKSPACE_DIR = "/workspace"

# File size limits
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

SECRETS_BASE = Path("/etc/secrets")

CONNECTIONS_DIR = SECRETS_BASE / "connections"


def get_notebook_path() -> str | None:
    """Get the notebook file path from environment variable."""
    initialization_data_str = os.environ.get("INITIALIZATION_DATA")
    if not initialization_data_str:
        return None

    import json

    initialization_data = json.loads(initialization_data_str)
    return initialization_data.get("notebook_path")


def get_workspace_path() -> str | None:
    """Get the workspace path from environment variable."""
    initialization_data_str = os.environ.get("INITIALIZATION_DATA")
    if not initialization_data_str:
        return None

    import json

    initialization_data = json.loads(initialization_data_str)
    return initialization_data.get("workspace_path")
