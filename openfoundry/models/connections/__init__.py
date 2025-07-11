from .connection import Connection, ConnectionBase
from .databricks_connection import DatabricksConnection
from .snowflake_connection import SnowflakeConnection

ALL_CONNECTION_CLASSES: list[type[ConnectionBase]] = [
    SnowflakeConnection,
    DatabricksConnection,
]

__all__ = [
    "Connection",
    "SnowflakeConnection",
    "DatabricksConnection",
    "ALL_CONNECTION_CLASSES",
]
