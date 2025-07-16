from .clickhouse_connection import ClickhouseConnection
from .connection import Connection, ConnectionBase
from .databricks_connection import DatabricksConnection
from .snowflake_connection import SnowflakeConnection

ALL_CONNECTION_CLASSES: list[type[ConnectionBase]] = [
    SnowflakeConnection,
    DatabricksConnection,
    ClickhouseConnection,
]

__all__ = [
    "Connection",
    "SnowflakeConnection",
    "DatabricksConnection",
    "ClickhouseConnection",
    "ALL_CONNECTION_CLASSES",
]
