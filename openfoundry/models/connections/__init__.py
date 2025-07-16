from .connection import Connection, ConnectionBase
from .databricks_connection import DatabricksConnection
from .postgres_connection import PostgresConnection
from .snowflake_connection import SnowflakeConnection

ALL_CONNECTION_CLASSES: list[type[ConnectionBase]] = [
    SnowflakeConnection,
    DatabricksConnection,
    PostgresConnection,
]

__all__ = [
    "Connection",
    "SnowflakeConnection",
    "DatabricksConnection",
    "PostgresConnection",
    "ALL_CONNECTION_CLASSES",
]
