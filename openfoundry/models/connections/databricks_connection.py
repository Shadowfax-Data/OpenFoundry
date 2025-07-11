import databricks.sql
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from openfoundry.models.connections.connection import (
    ConnectionBase,
    ConnectionType,
)


class DatabricksConnection(ConnectionBase):
    __tablename__ = "databricks_connections"

    type = ConnectionType.DATABRICKS

    # No port since dbt-databricks always uses port 443
    host: Mapped[str] = mapped_column(nullable=False)
    http_path: Mapped[str] = mapped_column(nullable=False)

    # Personal Access Token
    access_token: Mapped[str] = mapped_column(nullable=False)

    database: Mapped[str] = mapped_column(nullable=False)
    schema: Mapped[str] = mapped_column(nullable=False)

    def get_env_vars(self) -> dict[str, str]:
        """Get the secret data for the DatabricksConnection."""
        return {
            "DATABRICKS_HOST": self.host,
            "DATABRICKS_HTTP_PATH": self.http_path,
            "DATABRICKS_TOKEN": self.access_token,
            "DATABRICKS_CATALOG": self.database,
            "DATABRICKS_SCHEMA": self.schema,
        }

    def check_connection(self) -> None:
        """Check the connection to the DatabricksConnection."""
        with (
            databricks.sql.connect(
                server_hostname=self.host,
                http_path=self.http_path,
                access_token=self.access_token,
                _socket_timeout=10,
                _retry_stop_after_attempts_duration=10,
            ) as conn,
            conn.cursor() as cur,
        ):
            cur.execute("SELECT 1")
