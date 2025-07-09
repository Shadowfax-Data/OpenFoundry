from .connection import Connection, ConnectionBase
from .snowflake_connection import SnowflakeConnection

ALL_CONNECTION_CLASSES: list[type[ConnectionBase]] = [
    SnowflakeConnection,
]

__all__ = [
    "Connection",
    "SnowflakeConnection",
    "ALL_CONNECTION_CLASSES",
]
