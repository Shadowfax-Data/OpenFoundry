from clickhouse_connect import common, dbapi
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from openfoundry.models.connections.connection import (
    ConnectionBase,
    ConnectionType,
)


class ClickhouseConnection(ConnectionBase):
    __tablename__ = "clickhouse_connections"

    type = ConnectionType.CLICKHOUSE

    host: Mapped[str] = mapped_column(nullable=False)
    port: Mapped[int] = mapped_column(nullable=False)
    username: Mapped[str] = mapped_column(nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)

    database: Mapped[str] = mapped_column(nullable=False)

    def get_env_vars(self) -> dict[str, str]:
        """Get the secret data for the ClickhouseConnection."""
        return {
            "CLICKHOUSE_HOST": self.host,
            "CLICKHOUSE_PORT": str(self.port),
            "CLICKHOUSE_USERNAME": self.username,
            "CLICKHOUSE_PASSWORD": self.password,
            "CLICKHOUSE_DATABASE": self.database,
        }

    def check_connection(self) -> None:
        """Check the connection to Clickhouse using DB-API interface."""
        # Set ClickHouse connection settings for better compatibility
        common.set_setting("autogenerate_session_id", False)

        conn = dbapi.connect(
            host=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            database=self.database,
            secure=True,
        )
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
        finally:
            conn.close()
