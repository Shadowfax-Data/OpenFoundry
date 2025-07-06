import enum
import uuid
from datetime import datetime

import uuid6
from sqlalchemy import DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.config import SANDBOX_IMAGE, SANDBOX_PORT
from openfoundry.database import Base
from openfoundry.logger import logger
from openfoundry.models.agent_sessions import docker_utils


class AgentSessionType(enum.Enum):
    APP_AGENT_SESSION = "app_agent_session"


class AgentSessionStatus(enum.Enum):
    ACTIVE = "active"
    STOPPED = "stopped"


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID, primary_key=True, default=uuid6.uuid6
    )
    type: Mapped[AgentSessionType] = mapped_column(
        Enum(AgentSessionType), nullable=False
    )
    status: Mapped[AgentSessionStatus] = mapped_column(
        Enum(AgentSessionStatus), nullable=False, default=AgentSessionStatus.ACTIVE
    )
    is_running_on: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    version: Mapped[int] = mapped_column(nullable=False, default=0)
    current_agent: Mapped[str] = mapped_column(nullable=False)
    last_message_id: Mapped[str | None] = mapped_column(nullable=True)
    container_id: Mapped[str] = mapped_column(nullable=False)
    port: Mapped[int] = mapped_column(nullable=False)


class AgentSessionBase(Base):
    """Abstract base for each session subtype."""

    __abstract__ = True

    session_type: AgentSessionType

    id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID,
        ForeignKey("agent_sessions.id"),
        primary_key=True,
        default=uuid6.uuid6,
    )

    @declared_attr
    def agent_session(cls) -> Mapped[AgentSession]:
        """Relationship back to the root AgentSession row."""
        return relationship(AgentSession)

    def as_agent_session(
        self, agent: str, container_id: str, port: int
    ) -> AgentSession:
        """Create an AgentSession instance with this session's data and the specified agent."""
        return AgentSession(
            id=self.id,
            type=self.session_type,
            current_agent=agent,
            status=AgentSessionStatus.ACTIVE,
            container_id=container_id,
            port=port,
        )

    def get_trace_metadata(self) -> dict[str, str]:
        """Get trace metadata for this agent session type.

        Returns:
            Dict of metadata to include in agent run traces.

        """
        return {
            "session_type": self.session_type.value,
            "session_id": str(self.id),
        }

    def get_initialization_data(self) -> dict:
        """Return initialization data to be stored as env.

        This data will be read by the sandbox server at startup for eager initialization.
        """
        return {
            "agent_session_id": str(self.id),
        }

    def get_docker_config(self) -> dict:
        """Get Docker configuration for this session type.

        Returns:
            Dict with Docker configuration including image, ports, agent, etc.
            Should be overridden by subclasses for specific configurations.

        """
        return {
            "image": SANDBOX_IMAGE,
            "ports": {f"{SANDBOX_PORT}/tcp": None},
            "agent": "default_agent",
        }

    def get_container_name(self) -> str:
        """Get the container name for this session.

        Returns:
            Container name string. Can be overridden by subclasses.

        """
        return f"session-{self.id}"

    def create_in_docker(self, workspace_dir: str) -> dict:
        """Create Docker container for this agent session.

        Args:
            workspace_dir: Workspace directory to copy to container.

        Returns:
            Dict containing container_id, assigned_sandbox_port, and any additional ports.

        """
        logger.info(f"Creating Docker container for session {self.id}")
        container_id, port_mappings = docker_utils.create_docker_container(
            docker_config=self.get_docker_config(),
            initialization_data=self.get_initialization_data(),
            container_name=self.get_container_name(),
            workspace_dir=workspace_dir,
        )

        # Get the main sandbox port
        sandbox_port_key = f"{SANDBOX_PORT}/tcp"
        if sandbox_port_key not in port_mappings:
            raise RuntimeError(
                f"Sandbox port ({sandbox_port_key}) is required but not assigned"
            )
        assigned_sandbox_port = port_mappings[sandbox_port_key]

        logger.info(f"Docker container created for session {self.id}")
        return {
            "container_id": container_id,
            "assigned_sandbox_port": assigned_sandbox_port,
            "port_mappings": port_mappings,
        }

    def resume_in_docker(self) -> dict:
        """Resume Docker container for this agent session.

        Returns:
            Dict containing container_id, assigned_sandbox_port, and any additional ports.

        """
        logger.info(f"Resuming Docker container for session {self.id}")
        container_id, port_mappings = docker_utils.start_docker_container(
            container_name=self.get_container_name(),
        )

        # Get the main sandbox port
        sandbox_port_key = f"{SANDBOX_PORT}/tcp"
        if sandbox_port_key not in port_mappings:
            raise RuntimeError(
                f"Sandbox port ({sandbox_port_key}) is required but not assigned"
            )
        assigned_sandbox_port = port_mappings[sandbox_port_key]

        logger.info(f"Docker container resumed for session {self.id}")
        return {
            "container_id": container_id,
            "assigned_sandbox_port": assigned_sandbox_port,
            "port_mappings": port_mappings,
        }
