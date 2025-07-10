from pathlib import Path

"""Configuration constants for the OpenFoundry sandbox."""

# Workspace directory path
WORKSPACE_DIR = "/workspace"

# File size limits
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

SECRETS_BASE = Path("/etc/secrets")

CONNECTIONS_DIR = SECRETS_BASE / "connections"
