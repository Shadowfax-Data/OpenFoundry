import psycopg2
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from openfoundry.models.connections.connection import (
    ConnectionBase,
    ConnectionType,
)


class PostgresConnection(ConnectionBase):
    __tablename__ = "postgres_connections"

    type = ConnectionType.POSTGRES

    host: Mapped[str] = mapped_column(nullable=False)
    port: Mapped[int] = mapped_column(nullable=False)
    user: Mapped[str] = mapped_column(nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)

    database: Mapped[str] = mapped_column(nullable=False)
    schema: Mapped[str] = mapped_column(nullable=False)

    def get_env_vars(self) -> dict[str, str]:
        """Get the secret data for the PostgresConnection."""
        return {
            "POSTGRES_HOST": self.host,
            "POSTGRES_PORT": str(self.port),
            "POSTGRES_USER": self.user,
            "POSTGRES_PASSWORD": self.password,
            "POSTGRES_DATABASE": self.database,
            "POSTGRES_SCHEMA": self.schema,
        }

    def check_connection(self) -> None:
        """Check the connection to the Postgres database."""
        with (
            psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                dbname=self.database,
                connect_timeout=10,
            ) as conn,
            conn.cursor() as curr,
        ):
            curr.execute("SELECT 1")
