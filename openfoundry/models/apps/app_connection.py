import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.database import Base
from openfoundry.models.apps.app import App
from openfoundry.models.connections import Connection


class AppConnection(Base):
    """Association object representing the relationship between an App and a Connection."""

    __tablename__ = "app_connections"

    app_id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("apps.id"), primary_key=True
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("connections.id"), primary_key=True
    )

    app: Mapped[App] = relationship("App", back_populates="app_connections")
    connection: Mapped[Connection] = relationship("Connection")
