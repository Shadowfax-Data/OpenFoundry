from fastapi import APIRouter
from pydantic import BaseModel

from openfoundry_sandbox.connections.connection import Connection
from openfoundry_sandbox.connections.connection_manager import connection_manager

router = APIRouter(prefix="/connections", tags=["connections"])


class ConnectionInfo(BaseModel):
    """Information about a connection."""

    name: str
    type: str


@router.get("/", response_model=list[ConnectionInfo])
def list_connections():
    """
    Lists the available initialized connections with their names and types.

    Connection names are determined by successfully initialized connections
    from /etc/secrets/connections/.
    """
    connection_names = connection_manager.list_connections()
    connections_info = []

    for name in connection_names:
        connection = connection_manager.get_connection(name)
        if connection is not None:
            # Determine connection type from class name
            connection_type = connection.__class__.__name__.lower().replace(
                "connection", ""
            )
            connections_info.append(ConnectionInfo(name=name, type=connection_type))

    return connections_info


def get_connection(connection_name: str) -> Connection | None:
    """
    Helper function to get a connection by name for use in other modules.

    Args:
        connection_name: The name of the connection to retrieve

    Returns:
        The connection object if found, None otherwise
    """
    return connection_manager.get_connection(connection_name)
