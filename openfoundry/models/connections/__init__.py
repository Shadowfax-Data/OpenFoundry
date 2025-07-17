from .bigquery_connection import BigQueryConnection
from .clickhouse_connection import ClickhouseConnection
from .connection import Connection, ConnectionBase
from .databricks_connection import DatabricksConnection
from .postgres_connection import PostgresConnection
from .snowflake_connection import SnowflakeConnection

ALL_CONNECTION_CLASSES: list[type[ConnectionBase]] = [
    SnowflakeConnection,
    DatabricksConnection,
    PostgresConnection,
    ClickhouseConnection,
    BigQueryConnection,
]

__all__ = [
    "Connection",
    "SnowflakeConnection",
    "DatabricksConnection",
    "PostgresConnection",
    "ClickhouseConnection",
    "BigQueryConnection",
    "ALL_CONNECTION_CLASSES",
]
