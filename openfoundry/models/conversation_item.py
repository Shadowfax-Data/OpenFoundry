import uuid

from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.database import Base
from openfoundry.models.agent_sessions.agent_session import AgentSession


class ConversationItem(Base):
    """Model representing a single conversation item between a user and an agent."""

    __tablename__ = "conversation_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    agent_session_id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID, ForeignKey("agent_sessions.id"), nullable=False
    )
    message: Mapped[dict] = mapped_column(JSONB, nullable=False)
    agent_session: Mapped[AgentSession] = relationship(backref="conversation_items")
