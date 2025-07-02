import enum
import uuid
from datetime import datetime

import uuid6
from sqlalchemy import DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.database import Base


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
