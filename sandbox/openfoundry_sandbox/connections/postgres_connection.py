from typing import Any

import psycopg2

from .connection import Connection


class PostgresConnection(Connection):
    def __init__(
        self,
        secrets: dict[str, str],
        **kwargs: Any,
    ) -> None:
        """
        Initialize PostgresConnection with configuration.

        Args:
            secrets: Dictionary of secret parameters (matching PostgresDestination structure).
                     Expected keys: POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DATABASE,
                     POSTGRES_USER, POSTGRES_PASSWORD
            **kwargs: Additional arguments passed to parent class
        """
        super().__init__(
            secrets=secrets,
            **kwargs,
        )

        self.host = secrets["POSTGRES_HOST"]
        self.port = int(secrets.get("POSTGRES_PORT", 5432))
        self.database = secrets["POSTGRES_DATABASE"]
        self.user = secrets["POSTGRES_USER"]
        self.password = secrets["POSTGRES_PASSWORD"]

    def _init_connection(self) -> None:
        """Initialize the PostgreSQL connection"""
        conn_params = {
            "host": self.host,
            "port": self.port,
            "dbname": self.database,
            "user": self.user,
            "password": self.password,
        }

        self._conn = psycopg2.connect(**conn_params)

    def cleanup(self) -> None:
        """Clean up any resources used by the connection"""
        self.close()
