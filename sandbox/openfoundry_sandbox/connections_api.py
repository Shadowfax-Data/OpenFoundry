from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from connections.connection import Connection
from openfoundry_sandbox.connection_manager import connection_manager

router = APIRouter(prefix="/connections", tags=["connections"])


class ConnectionInfo(BaseModel):
    """Information about a connection."""

    name: str
    type: str
    status: str


@router.get("/", response_model=list[str])
def list_connections():
    """
    Lists the names of available initialized connections.

    Connection names are determined by successfully initialized connections
    from /etc/secrets/connections/.
    """
    try:
        return connection_manager.list_connections()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving connections: {e}"
        )


@router.get("/{connection_name}")
def get_connection_info(connection_name: str):
    """
    Get information about a specific connection.
    """
    try:
        connection = connection_manager.get_connection(connection_name)
        if connection is None:
            raise HTTPException(
                status_code=404, detail=f"Connection '{connection_name}' not found"
            )

        # Try to determine connection type from class name
        connection_type = connection.__class__.__name__.lower().replace(
            "connection", ""
        )

        return ConnectionInfo(
            name=connection_name, type=connection_type, status="active"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving connection info: {e}"
        )


def get_connection(connection_name: str) -> Optional[Connection]:
    """
    Helper function to get a connection by name for use in other modules.

    Args:
        connection_name: The name of the connection to retrieve

    Returns:
        The connection object if found, None otherwise
    """
    return connection_manager.get_connection(connection_name)
