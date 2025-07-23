import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.logger import logger
from openfoundry.models.agent_sessions.docker_utils import SecretPayload
from openfoundry.models.notebooks import Notebook

from .agent_session import AgentSessionBase, AgentSessionType


class NotebookAgentSession(AgentSessionBase):
    __tablename__ = "notebook_agent_sessions"

    session_type = AgentSessionType.NOTEBOOK_AGENT_SESSION

    notebook_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("notebooks.id"), nullable=False
    )

    notebook: Mapped[Notebook] = relationship(backref="notebook_agent_sessions")

    def get_initialization_data(self) -> dict:
        """Return initialization data for notebook sessions."""
        base_data = super().get_initialization_data()

        # Add notebook-specific initialization
        base_data.update(
            {
                "notebook_session": True,
                "notebook_path": "/workspace/notebook.ipynb",
                "workspace_path": "/workspace",
            }
        )

        return base_data

    def get_docker_config(self) -> dict:
        """Get Docker configuration for notebook agent sessions."""
        config = super().get_docker_config()
        # Notebooks don't need additional ports like streamlit apps
        # The sandbox server port is sufficient for notebook operations
        return config

    def get_container_name(self) -> str:
        """Get the container name for notebook sessions."""
        return f"notebook-session-{self.id}"

    def create_in_docker(
        self, workspace_dir: str, secrets: list[SecretPayload] | None = None
    ) -> dict:
        """Create Docker container with notebook-specific configuration.

        Args:
            workspace_dir: Workspace directory to copy to container.
            secrets: Secrets to materialize into the container.

        Returns:
            Dict containing container_id, assigned_sandbox_port.

        """
        result = super().create_in_docker(workspace_dir, secrets)

        logger.info(f"Created notebook session container: {result['container_id']}")

        return result

    def resume_in_docker(self) -> dict:
        """Resume Docker container with notebook-specific configuration.

        Returns:
            Dict containing container_id, assigned_sandbox_port.

        """
        result = super().resume_in_docker()

        logger.info(f"Resumed notebook session container: {result['container_id']}")

        return result
