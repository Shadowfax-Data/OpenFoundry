from typing import Optional
from uuid import UUID

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.connections.connection import Connection
from openfoundry.models.connections.postgres_connection import PostgresConnection

router = APIRouter(prefix="/api/connections")


class PostgresConnectionCreate(BaseModel):
    name: str
    host: str
    port: int
    user: str
    password: str
    database: str
    schema_: str = Field(..., alias="schema")


class PostgresConnectionUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    user: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None
    schema_: Optional[str] = Field(None, alias="schema")


class PostgresConnectionModel(BaseModel):
    id: UUID
    name: str
    host: str
    port: int
    user: str
    password: str
    database: str
    schema_: str = Field(..., alias="schema")
    type: str

    class Config:
        from_attributes = True


@router.get(
    "/postgres/{connection_id}",
    response_model=PostgresConnectionModel,
)
def get_postgres_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    connection = (
        db.query(PostgresConnection)
        .filter(
            PostgresConnection.id == connection_id,
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="connection not found"
        )

    setattr(connection, "type", connection.type.value)
    return PostgresConnectionModel.model_validate(connection)


@router.post("/postgres", response_model=PostgresConnectionModel)
def create_postgres_connection(
    request: Request, connection_data: PostgresConnectionCreate
):
    db: Session = request.state.db

    # Check if a connection with the same name already exists and is not soft-deleted
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

    postgres_connection = PostgresConnection(
        id=connection_id,
        name=connection_data.name,
        host=connection_data.host,
        port=connection_data.port,
        user=connection_data.user,
        password=connection_data.password,
        database=connection_data.database,
        schema=connection_data.schema_,
    )
    try:
        postgres_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Postgres: {e}",
        )

    db.add(postgres_connection)
    db.add(postgres_connection.as_connection())
    db.commit()
    db.refresh(postgres_connection)

    setattr(postgres_connection, "type", postgres_connection.type.value)
    return PostgresConnectionModel.model_validate(postgres_connection)


@router.put(
    "/postgres/{connection_id}",
    response_model=PostgresConnectionModel,
)
def update_postgres_connection(
    request: Request,
    connection_id: UUID,
    connection_data: PostgresConnectionUpdate,
):
    db: Session = request.state.db

    postgres_connection = (
        db.query(PostgresConnection)
        .filter(PostgresConnection.id == connection_id)
        .first()
    )

    if not postgres_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postgres connection not found",
        )

    update_data = connection_data.model_dump(exclude_unset=True)
    if "schema_" in update_data:
        update_data["schema"] = update_data.pop("schema_")

    # Check for name uniqueness if name is being updated
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
            setattr(postgres_connection, key, value)
    postgres_connection.connection.name = postgres_connection.name

    try:
        postgres_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Postgres with updated credentials: {e}",
        )

    db.commit()
    db.refresh(postgres_connection)

    setattr(postgres_connection, "type", postgres_connection.type.value)
    return PostgresConnectionModel.model_validate(postgres_connection)


@router.delete(
    "/postgres/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_postgres_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    specific_connection = (
        db.query(PostgresConnection)
        .options(joinedload(PostgresConnection.connection))
        .filter(PostgresConnection.id == connection_id)
        .first()
    )

    if not specific_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postgres connection not found",
        )

    specific_connection.connection.soft_delete()
    db.delete(specific_connection)
    db.commit()
