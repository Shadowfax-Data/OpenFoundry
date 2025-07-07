from uuid import UUID

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from openfoundry.models.connections.connection import Connection

router = APIRouter()


class ConnectionModel(BaseModel):
    id: UUID
    name: str
    connection_type: str


@router.get("/api/connections", response_model=list[ConnectionModel])
def list_connections(request: Request):
    db: Session = request.state.db

    connections = (
        db.query(Connection)
        .filter(
            Connection.deleted_on.is_(None),
        )
        .order_by(Connection.name)
        .all()
    )
    return [
        ConnectionModel(
            id=connection.id,
            name=connection.name,
            connection_type=connection.type.value,
        )
        for connection in connections
    ]
