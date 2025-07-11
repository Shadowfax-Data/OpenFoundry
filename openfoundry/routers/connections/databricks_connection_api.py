from typing import Optional
from uuid import UUID

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.connections.connection import Connection
from openfoundry.models.connections.databricks_connection import DatabricksConnection

router = APIRouter(prefix="/api/connections")


class DatabricksConnectionCreate(BaseModel):
    name: str
    host: str
    http_path: str
    access_token: str
    database: str
    schema_: str = Field(..., alias="schema")


class DatabricksConnectionUpdate(BaseModel):
    name: Optional[str] = None
    host: Optional[str] = None
    http_path: Optional[str] = None
    access_token: Optional[str] = None
    database: Optional[str] = None
    schema_: Optional[str] = Field(None, alias="schema")


class DatabricksConnectionModel(BaseModel):
    id: UUID
    name: str
    host: str
    http_path: str
    access_token: str
    database: str
    schema_: str = Field(..., alias="schema")
    connection_type: str

    class Config:
        from_attributes = True


@router.get(
    "/databricks/{connection_id}",
    response_model=DatabricksConnectionModel,
)
def get_databricks_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    connection = (
        db.query(DatabricksConnection)
        .filter(
            DatabricksConnection.id == connection_id,
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="connection not found"
        )

    setattr(connection, "connection_type", connection.type.value)
    return DatabricksConnectionModel.model_validate(connection)


@router.post("/databricks", response_model=DatabricksConnectionModel)
def create_databricks_connection(
    request: Request, connection_data: DatabricksConnectionCreate
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

    databricks_connection = DatabricksConnection(
        id=connection_id,
        name=connection_data.name,
        host=connection_data.host,
        http_path=connection_data.http_path,
        access_token=connection_data.access_token,
        database=connection_data.database,
        schema=connection_data.schema_,
    )
    try:
        databricks_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Databricks: {e}",
        )

    db.add(databricks_connection)
    db.add(databricks_connection.as_connection())
    db.commit()
    db.refresh(databricks_connection)

    setattr(databricks_connection, "connection_type", databricks_connection.type.value)
    return DatabricksConnectionModel.model_validate(databricks_connection)


@router.put(
    "/databricks/{connection_id}",
    response_model=DatabricksConnectionModel,
)
def update_databricks_connection(
    request: Request,
    connection_id: UUID,
    connection_data: DatabricksConnectionUpdate,
):
    db: Session = request.state.db

    databricks_connection = (
        db.query(DatabricksConnection)
        .filter(DatabricksConnection.id == connection_id)
        .first()
    )

    if not databricks_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Databricks connection not found",
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
            setattr(databricks_connection, key, value)
    databricks_connection.connection.name = databricks_connection.name

    try:
        databricks_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Databricks with updated credentials: {e}",
        )

    db.commit()
    db.refresh(databricks_connection)

    setattr(databricks_connection, "connection_type", databricks_connection.type.value)
    return DatabricksConnectionModel.model_validate(databricks_connection)


@router.delete(
    "/databricks/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_databricks_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    specific_connection = (
        db.query(DatabricksConnection)
        .options(joinedload(DatabricksConnection.connection))
        .filter(DatabricksConnection.id == connection_id)
        .first()
    )

    if not specific_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Databricks connection not found",
        )

    specific_connection.connection.soft_delete()
    db.delete(specific_connection)
    db.commit()
