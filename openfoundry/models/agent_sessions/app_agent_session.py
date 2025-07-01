import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.models.apps import App

from .agent_session import AgentSessionBase, AgentSessionType


class AppAgentSession(AgentSessionBase):
    __tablename__ = "app_agent_sessions"

    session_type = AgentSessionType.APP_AGENT_SESSION

    app_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("apps.id"), nullable=False)

    app: Mapped[App] = relationship(backref="app_agent_sessions")
