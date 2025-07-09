from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID

from openfoundry.database import Base

app_connection = Table(
    "app_connection",
    Base.metadata,
    Column(
        "app_id", PostgresUUID(as_uuid=True), ForeignKey("apps.id"), primary_key=True
    ),
    Column(
        "connection_id",
        PostgresUUID(as_uuid=True),
        ForeignKey("connections.id"),
        primary_key=True,
    ),
)
