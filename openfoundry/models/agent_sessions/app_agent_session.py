import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.config import SANDBOX_IMAGE, SANDBOX_PORT
from openfoundry.logger import logger
from openfoundry.models.apps import App

from .agent_session import AgentSessionBase, AgentSessionType


class AppAgentSession(AgentSessionBase):
    __tablename__ = "app_agent_sessions"

    session_type = AgentSessionType.APP_AGENT_SESSION

    app_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("apps.id"), nullable=False)

    app: Mapped[App] = relationship(backref="app_agent_sessions")

    app_port: Mapped[int] = mapped_column(nullable=False)

    def get_initialization_data(self) -> dict:
        """Return initialization data including streamlit app configuration."""
        base_data = super().get_initialization_data()

        # Add streamlit app configuration
        base_data.update(
            {
                "streamlit_run_config": {
                    "identifier": "streamlit_app",
                    "command_str": "streamlitgo run app.py --server.port 8501 --server.address 0.0.0.0 --server.headless true --server.enableCORS false --server.enableXsrfProtection false --browser.gatherUsageStats false --server.runOnSave=true",
                    "cwd": "/workspace",
                },
            }
        )

        return base_data

    def get_docker_config(self) -> dict:
        """Get Docker configuration for app agent sessions."""
        return {
            "image": SANDBOX_IMAGE,
            "ports": {
                f"{SANDBOX_PORT}/tcp": None,  # sandbox port
                "8501/tcp": None,  # app port
            },
            "agent": "streamlit_app_coding_agent",
        }

    def get_container_name(self) -> str:
        """Get the container name for app sessions."""
        return f"app-session-{self.id}"

    def create_in_docker(self, workspace_dir: str) -> dict:
        """Create Docker container with app-specific configuration.

        Args:
            workspace_dir: Workspace directory to copy to container.

        Returns:
            Dict containing container_id, assigned_sandbox_port, app_port, and agent.

        """
        result = super().create_in_docker(workspace_dir)

        # Extract the app port from port mappings
        app_port = result["port_mappings"].get("8501/tcp")
        if app_port:
            # Store the app port in the app_port field
            self.app_port = app_port
            result["app_port"] = app_port
            logger.info(f"Assigned app port: {app_port}")

        return result
