from typing import Any

import snowflake.connector

from .connection import Connection
from .utils import format_private_key_for_snowflake


class SnowflakeConnection(Connection):
    def __init__(
        self,
        secrets: dict[str, str],
        **kwargs: Any,
    ) -> None:
        """
        Initialize SnowflakeConnection with configuration.

        Args:
            secrets: Dictionary of secret parameters (matching SnowflakeDestination structure).
                     Expected keys: name, private_key, user, host, warehouse, role
            **kwargs: Additional arguments passed to parent class
        """
        super().__init__(
            secrets=secrets,
            **kwargs,
        )

        self.database = secrets["SNOWFLAKE_DATABASE"]
        self.schema = secrets["SNOWFLAKE_SCHEMA"]

        self.private_key = format_private_key_for_snowflake(
            secrets["SNOWFLAKE_PRIVATE_KEY"]
        )
        self.user = secrets["SNOWFLAKE_USER"]
        self.account = secrets["SNOWFLAKE_ACCOUNT"]
        self.warehouse = secrets["SNOWFLAKE_WAREHOUSE"]
        self.role = secrets["SNOWFLAKE_ROLE"]

    def _init_connection(self) -> None:
        """Initialize the Snowflake connection using keypair authentication"""
        self._conn = snowflake.connector.connect(
            user=self.user,
            private_key=self.private_key,
            account=self.account,
            warehouse=self.warehouse,
            database=self.database,
            schema=self.schema,
            role=self.role,
        )

    def cleanup(self) -> None:
        """Clean up any resources used by the connection"""
        self.close()
