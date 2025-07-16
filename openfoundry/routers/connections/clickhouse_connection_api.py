from uuid import UUID

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.connections.clickhouse_connection import ClickhouseConnection
from openfoundry.models.connections.connection import Connection

router = APIRouter(prefix="/api/connections")


class ClickhouseConnectionCreate(BaseModel):
    name: str
    host: str
    port: int
    username: str
    password: str
    database: str


class ClickhouseConnectionUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None
    username: str | None = None
    password: str | None = None
    database: str | None = None


class ClickhouseConnectionModel(BaseModel):
    id: UUID
    name: str
    host: str
    port: int
    username: str
    password: str
    database: str
    type: str

    class Config:
        from_attributes = True


@router.get("/clickhouse/{connection_id}", response_model=ClickhouseConnectionModel)
def get_clickhouse_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    connection = (
        db.query(ClickhouseConnection)
        .filter(ClickhouseConnection.id == connection_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="connection not found"
        )

    setattr(connection, "type", connection.type.value)
    return ClickhouseConnectionModel.model_validate(connection)


@router.post("/clickhouse", response_model=ClickhouseConnectionModel)
def create_clickhouse_connection(
    request: Request, connection_data: ClickhouseConnectionCreate
):
    db: Session = request.state.db

    existing_connection = (
        db.query(Connection)
        .filter(
            Connection.name == connection_data.name, Connection.deleted_on.is_(None)
        )
        .first()
    )

    if existing_connection:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection name must be unique",
        )

    connection_id = uuid6.uuid6()

    clickhouse_connection = ClickhouseConnection(
        id=connection_id,
        name=connection_data.name,
        host=connection_data.host,
        port=connection_data.port,
        username=connection_data.username,
        password=connection_data.password,
        database=connection_data.database,
    )
    try:
        clickhouse_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Clickhouse: {e}",
        )

    db.add(clickhouse_connection)
    db.add(clickhouse_connection.as_connection())
    db.commit()
    db.refresh(clickhouse_connection)

    setattr(clickhouse_connection, "type", clickhouse_connection.type.value)
    return ClickhouseConnectionModel.model_validate(clickhouse_connection)


@router.put("/clickhouse/{connection_id}", response_model=ClickhouseConnectionModel)
def update_clickhouse_connection(
    request: Request, connection_id: UUID, connection_data: ClickhouseConnectionUpdate
):
    db: Session = request.state.db

    clickhouse_connection = (
        db.query(ClickhouseConnection)
        .filter(ClickhouseConnection.id == connection_id)
        .first()
    )

    if not clickhouse_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="connection not found"
        )

    update_data = connection_data.model_dump(exclude_unset=True)

    if "name" in update_data:
        existing_connection = (
            db.query(Connection)
            .filter(
                Connection.name == update_data["name"],
                Connection.deleted_on.is_(None),
                Connection.id != connection_id,
            )
            .first()
        )

        if existing_connection:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connection name must be unique",
            )

    for key, value in update_data.items():
        if value is not None:
            setattr(clickhouse_connection, key, value)
    clickhouse_connection.connection.name = clickhouse_connection.name

    try:
        clickhouse_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Clickhouse with updated credentials: {e}",
        )

    db.commit()
    db.refresh(clickhouse_connection)

    setattr(clickhouse_connection, "type", clickhouse_connection.type.value)
    return ClickhouseConnectionModel.model_validate(clickhouse_connection)


@router.delete("/clickhouse/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_clickhouse_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    specific_connection = (
        db.query(ClickhouseConnection)
        .options(joinedload(ClickhouseConnection.connection))
        .filter(ClickhouseConnection.id == connection_id)
        .first()
    )

    if not specific_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clickhouse connection not found",
        )

    specific_connection.connection.soft_delete()
    db.delete(specific_connection)
    db.commit()
