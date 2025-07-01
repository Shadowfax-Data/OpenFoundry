import uuid

import uuid6
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from openfoundry.database import Base


class App(Base):
    """Model representing an application."""

    __tablename__ = "apps"

    id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID, primary_key=True, default=uuid6.uuid6
    )
    name: Mapped[str] = mapped_column(nullable=False)
