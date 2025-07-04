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
