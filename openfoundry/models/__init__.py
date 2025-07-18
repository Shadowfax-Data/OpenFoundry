# Import all models so they are registered with Base.metadata for Alembic autogenerate
from openfoundry.database import Base
from openfoundry.models.agent_sessions import (
    AgentSession,
    AgentSessionBase,
    AgentSessionStatus,
    AgentSessionType,
    AppAgentSession,
    NotebookAgentSession,
)
from openfoundry.models.apps import App
from openfoundry.models.connections import Connection, SnowflakeConnection
from openfoundry.models.conversation_item import ConversationItem
from openfoundry.models.notebooks import Notebook, NotebookConnection

__all__ = [
    "Base",
    "App",
    "AgentSession",
    "AgentSessionBase",
    "AgentSessionStatus",
    "AgentSessionType",
    "AppAgentSession",
    "NotebookAgentSession",
    "Notebook",
    "NotebookConnection",
    "ConversationItem",
    "Connection",
    "SnowflakeConnection",
]
