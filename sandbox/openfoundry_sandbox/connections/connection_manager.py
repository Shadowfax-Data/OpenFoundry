from __future__ import annotations

import logging
import os
from pathlib import Path

from openfoundry_sandbox.config import CONNECTIONS_DIR
from openfoundry_sandbox.connections.connection import Connection
from openfoundry_sandbox.connections.databricks_connection import (
    DatabricksConnection,
)
from openfoundry_sandbox.connections.snowflake_connection import (
    SnowflakeConnection,
)

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Singleton manager for database connections."""

    _instance: "ConnectionManager" | None = None
    _connections: dict[str, Connection] = {}

    # Registry of connection types - easily extensible for new connection types
    _connection_types: dict[str, type[Connection]] = {
        "snowflake": SnowflakeConnection,
        "databricks": DatabricksConnection,
        # Add more connection types here as they are implemented
    }

    def __new__(cls) -> "ConnectionManager":
        """Ensure singleton pattern."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the connection manager."""
        # Only initialize once
        if hasattr(self, "_initialized"):
            return
        self._initialized = True
        logger.info("ConnectionManager initialized")

    def get_connection(self, connection_name: str) -> Connection | None:
        """Get a connection by name."""
        return self._connections.get(connection_name)

    def list_connections(self) -> list[str]:
        """List all available connection names."""
        return list(self._connections.keys())

    def add_connection(self, secrets_dir: Path, connection_name: str) -> None:
        """Add a new connection from a secrets directory.

        Args:
            secrets_dir: Path to the directory containing connection secrets
            connection_name: Name of the connection

        Raises:
            ValueError: If connection cannot be created or added
        """
        connection = self._create_connection(connection_name, secrets_dir)
        if not connection:
            raise ValueError(f"Failed to create connection '{connection_name}'")

        self._connections[connection_name] = connection
        logger.info(f"Successfully added connection: {connection_name}")

    def initialize_connections(self) -> None:
        """Initialize all connections from the connections directory."""
        logger.info(f"Initializing connections from {CONNECTIONS_DIR}")

        if not os.path.exists(CONNECTIONS_DIR):
            logger.warning(f"Connections directory {CONNECTIONS_DIR} does not exist")
            return

        for connection_name in os.listdir(CONNECTIONS_DIR):
            connection_path = Path(CONNECTIONS_DIR) / connection_name

            if not connection_path.is_dir():
                logger.debug(f"Skipping non-directory: {connection_path}")
                continue

            try:
                connection = self._create_connection(connection_name, connection_path)
                if connection:
                    self._connections[connection_name] = connection
                    logger.info(
                        f"Successfully initialized connection: {connection_name}"
                    )
                else:
                    logger.warning(f"Failed to create connection: {connection_name}")
            except Exception as e:
                logger.error(f"Error initializing connection {connection_name}: {e}")

    def _create_connection(
        self, connection_name: str, connection_path: Path
    ) -> Connection | None:
        """Create a connection from the files in the connection directory."""
        try:
            secrets = {}
            for file_path in connection_path.iterdir():
                if file_path.is_file():
                    try:
                        with open(file_path, "r") as f:
                            content = f.read().strip()

                        secrets[file_path.stem] = content

                    except Exception as e:
                        logger.error(f"Error reading file {file_path}: {e}")
                        continue

            if not secrets:
                logger.warning(f"No secrets found for connection {connection_name}")
                return None

            connection_type = self._determine_connection_type(connection_name, secrets)

            if connection_type not in self._connection_types:
                logger.error(
                    f"Unknown connection type '{connection_type}' for connection {connection_name}"
                )
                return None

            # Create the connection instance
            connection_class = self._connection_types[connection_type]
            return connection_class(secrets=secrets)

        except Exception as e:
            logger.error(f"Error creating connection {connection_name}: {e}")
            return None

    def _determine_connection_type(self, connection_name: str, secrets: dict) -> str:
        """Determine the connection type based on secret key prefixes."""
        # Determine type based on secret key prefixes
        for key in secrets.keys():
            if key.startswith("SNOWFLAKE_"):
                return "snowflake"
            elif key.startswith("DATABRICKS_"):
                return "databricks"

        raise ValueError(f"Could not determine connection type for {connection_name}")

    def cleanup_connections(self) -> None:
        """Clean up all connections."""
        logger.info("Cleaning up all connections")
        for connection_name, connection in self._connections.items():
            try:
                if hasattr(connection, "cleanup"):
                    connection.cleanup()
                else:
                    connection.close()
                logger.debug(f"Cleaned up connection: {connection_name}")
            except Exception as e:
                logger.error(f"Error cleaning up connection {connection_name}: {e}")

        self._connections.clear()


# Global singleton instance
connection_manager = ConnectionManager()
