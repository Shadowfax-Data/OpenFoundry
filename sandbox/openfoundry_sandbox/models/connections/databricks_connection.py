from typing import Any

import databricks.sql

from .connection import Connection


class DatabricksConnection(Connection):
    def __init__(
        self,
        secrets: dict[str, str],
        **kwargs: Any,
    ) -> None:
        """
        Initialize DatabricksConnection with configuration.

        Args:
            secrets: Dictionary of secret parameters.
                     Expected keys: DATABRICKS_HOST, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN,
                                  DATABRICKS_CATALOG, DATABRICKS_SCHEMA
            **kwargs: Additional arguments passed to parent class
        """
        super().__init__(
            secrets=secrets,
            **kwargs,
        )

        self.host = secrets["DATABRICKS_HOST"]
        self.http_path = secrets["DATABRICKS_HTTP_PATH"]
        self.access_token = secrets["DATABRICKS_TOKEN"]
        self.catalog = secrets["DATABRICKS_CATALOG"]
        self.schema = secrets["DATABRICKS_SCHEMA"]

    def _init_connection(self) -> None:
        """Initialize the Databricks connection using access token authentication"""
        self._conn = databricks.sql.connect(
            server_hostname=self.host,
            http_path=self.http_path,
            access_token=self.access_token,
            catalog=self.catalog,
            schema=self.schema,
        )

    def cleanup(self) -> None:
        """Clean up any resources used by the connection"""
        self.close()
