import enum
import io
import json
import tarfile
import uuid
from datetime import datetime

import docker
import uuid6
from fastapi import HTTPException, status
from sqlalchemy import DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.config import SANDBOX_IMAGE, SANDBOX_PORT
from openfoundry.database import Base
from openfoundry.logger import logger


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

        Raises:
            HTTPException: If container creation fails.

        """
        try:
            docker_client = docker.from_env()
            logger.info(f"Creating Docker container for session {self.id}")

            # Get session-specific configuration
            docker_config = self.get_docker_config()
            initialization_data = self.get_initialization_data()

            env_vars = {
                "INITIALIZATION_DATA": json.dumps(initialization_data),
            }
            logger.info(f"Environment variables: {env_vars}")

            # Create and start the container
            container = docker_client.containers.run(
                image=docker_config["image"],
                ports=docker_config["ports"],
                detach=True,
                name=self.get_container_name(),
                environment=env_vars,
            )

            logger.info(f"Docker container created for session {self.id}")

            # Get container information
            container.reload()  # Refresh container info to get port mapping
            container_id = container.id
            container_name = container.name
            logger.info(
                f"Container ID: {container_id}, Container Name: {container_name}"
            )

            # Get assigned ports
            port_mappings = {}
            for container_port in docker_config["ports"]:
                if container_port in container.ports:
                    host_port = container.ports[container_port][0]["HostPort"]
                    port_mappings[container_port] = int(host_port)
                    logger.info(f"Assigned port for {container_port}: {host_port}")

            # Get the main sandbox port
            sandbox_port_key = f"{SANDBOX_PORT}/tcp"
            assigned_sandbox_port = port_mappings[sandbox_port_key]

            # Copy workspace files to container
            logger.info(
                f"Copying workspace files from {workspace_dir} to container /workspace"
            )
            tar_stream = io.BytesIO()
            with tarfile.open(fileobj=tar_stream, mode="w") as t:
                t.add(str(workspace_dir), arcname=".")
            tar_stream.seek(0)
            container.put_archive("/workspace", tar_stream.read())
            logger.info("Successfully copied workspace files to container")

            # Return container information
            result = {
                "container_id": container_id,
                "assigned_sandbox_port": assigned_sandbox_port,
                "port_mappings": port_mappings,
                "agent": docker_config["agent"],
            }

            return result

        except docker.errors.ImageNotFound:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Docker image '{docker_config['image']}' not found",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create Docker container: {str(e)}",
            )
