import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.database import Base
from openfoundry.models.connections import Connection
from openfoundry.models.notebooks.notebook import Notebook


class NotebookConnection(Base):
    """Association object representing the relationship between a Notebook and a Connection."""

    __tablename__ = "notebook_connections"

    notebook_id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("notebooks.id"), primary_key=True
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID(as_uuid=True), ForeignKey("connections.id"), primary_key=True
    )

    notebook: Mapped[Notebook] = relationship(
        "Notebook", back_populates="notebook_connections"
    )
    connection: Mapped[Connection] = relationship("Connection")
