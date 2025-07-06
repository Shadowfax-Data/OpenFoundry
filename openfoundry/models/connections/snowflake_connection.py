from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from openfoundry.models.connections.connection import (
    ConnectionBase,
    ConnectionType,
)


def format_private_key_for_snowflake(private_key_str: str) -> str:
    """Formats a private key string for use with the Snowflake connector.

    Args:
        private_key_str: The private key string.

    Returns:
        The processed private key string, ready for the Snowflake connector.

    """
    if (
        "BEGIN PRIVATE KEY" in private_key_str
        or "BEGIN RSA PRIVATE KEY" in private_key_str
    ):
        # Remove header and footer lines for both PKCS8 and RSA formats
        lines = private_key_str.split("\n")
        unnecessary_headers_footers = set(
            [
                "BEGIN PRIVATE KEY",
                "BEGIN RSA PRIVATE KEY",
                "END PRIVATE KEY",
                "END RSA PRIVATE KEY",
            ]
        )
        filtered_lines = [
            line
            for line in lines
            if not any(header in line for header in unnecessary_headers_footers)
        ]
        return "".join(filtered_lines).strip()
    else:
        # Assume it's already processed
        return private_key_str.strip()


class SnowflakeConnection(ConnectionBase):
    __tablename__ = "snowflake_connections"

    type = ConnectionType.SNOWFLAKE

    account: Mapped[str] = mapped_column(nullable=False)
    user: Mapped[str] = mapped_column(nullable=False)
    private_key: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(nullable=False)

    database: Mapped[str] = mapped_column(nullable=False)
    warehouse: Mapped[str] = mapped_column(nullable=False)
    schema: Mapped[str] = mapped_column(nullable=False)

    def get_env_vars(self) -> dict[str, str]:
        """Get the secret data for the SnowflakeConnection."""
        return {
            "SNOWFLAKE_ACCOUNT": self.account,
            "SNOWFLAKE_USER": self.user,
            "SNOWFLAKE_ROLE": self.role,
            "SNOWFLAKE_DATABASE": self.database,
            "SNOWFLAKE_WAREHOUSE": self.warehouse,
            "SNOWFLAKE_SCHEMA": self.schema,
            "SNOWFLAKE_PRIVATE_KEY": format_private_key_for_snowflake(self.private_key),
        }
