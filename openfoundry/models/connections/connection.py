import enum
from abc import abstractmethod
from datetime import datetime
from uuid import UUID

import uuid6
from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import (
    Mapped,
    declared_attr,
    mapped_column,
    relationship,
)

from openfoundry.database import Base


class ConnectionType(enum.Enum):
    SNOWFLAKE = "snowflake"
    DATABRICKS = "databricks"
    POSTGRES = "postgres"
    CLICKHOUSE = "clickhouse"
    BIGQUERY = "bigquery"


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[UUID] = mapped_column(
        PostgresUUID, primary_key=True, default=uuid6.uuid6
    )
    type: Mapped[ConnectionType] = mapped_column(Enum(ConnectionType), nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)

    # Soft-delete metadata
    deleted_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    def soft_delete(self):
        self.deleted_on = func.now()


class ConnectionBase(Base):
    """Base class for all connections."""

    __abstract__ = True
    type: ConnectionType

    id: Mapped[UUID] = mapped_column(
        PostgresUUID,
        ForeignKey("connections.id"),
        primary_key=True,
        default=uuid6.uuid6,
    )
    name: Mapped[str] = mapped_column(nullable=False)

    @declared_attr
    def connection(cls) -> Mapped[Connection]:
        return relationship(Connection)

    def as_connection(self) -> Connection:
        """Create a Connection instance from this destination."""
        return Connection(
            id=self.id,
            type=self.type,
            name=self.name,
        )

    @abstractmethod
    def check_connection(self) -> None:
        """Check the connection to the Connection. Raise Exception if the connection is not successful."""
        raise NotImplementedError

    @abstractmethod
    def get_env_vars(self) -> dict[str, str]:
        """Get the secret data for the Connection."""
        raise NotImplementedError
