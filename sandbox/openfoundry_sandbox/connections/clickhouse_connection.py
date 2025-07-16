from typing import Any

from clickhouse_connect import common, dbapi

from .connection import Connection


class ClickhouseConnection(Connection):
    def __init__(
        self,
        secrets: dict[str, str],
        **kwargs: Any,
    ) -> None:
        """
        Initialize ClickhouseConnection with configuration.

        Args:
            secrets: Dictionary of secret parameters (matching ClickhouseConnection structure).
                     Expected keys: host, port, username, password, database
            **kwargs: Additional arguments passed to parent class
        """
        super().__init__(secrets=secrets, **kwargs)

        self.host = secrets["CLICKHOUSE_HOST"]
        self.port = int(secrets["CLICKHOUSE_PORT"])
        self.username = secrets["CLICKHOUSE_USERNAME"]
        self.password = secrets["CLICKHOUSE_PASSWORD"]
        self.database = secrets["CLICKHOUSE_DATABASE"]

    def _init_connection(self) -> None:
        """Initialize the Clickhouse connection using DB-API interface."""
        # Set ClickHouse connection settings for better compatibility
        common.set_setting("autogenerate_session_id", False)

        self._conn = dbapi.connect(
            host=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            database=self.database,
            secure=True,
        )

    def cleanup(self) -> None:
        """Clean up any resources used by the connection"""
        self.close()
