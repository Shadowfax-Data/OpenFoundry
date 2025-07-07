from typing import Optional
from uuid import UUID

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.connections.snowflake_connection import SnowflakeConnection

router = APIRouter(prefix="/api/connections")


class SnowflakeConnectionCreate(BaseModel):
    name: str
    account: str
    user: str
    role: str
    database: str
    warehouse: str
    schema_: str = Field(..., alias="schema")
    private_key: str


class SnowflakeConnectionUpdate(BaseModel):
    name: Optional[str] = None
    account: Optional[str] = None
    user: Optional[str] = None
    role: Optional[str] = None
    database: Optional[str] = None
    warehouse: Optional[str] = None
    schema_: Optional[str] = Field(None, alias="schema")
    private_key: Optional[str] = None


class SnowflakeConnectionModel(BaseModel):
    id: UUID
    name: str
    account: str
    user: str
    role: str
    database: str
    warehouse: str
    schema_: str = Field(..., alias="schema")

    class Config:
        from_attributes = True


@router.get(
    "/snowflake/{connection_id}",
    response_model=SnowflakeConnectionModel,
)
def get_snowflake_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    connection = (
        db.query(SnowflakeConnection)
        .filter(
            SnowflakeConnection.id == connection_id,
        )
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="connection not found"
        )

    return SnowflakeConnectionModel.model_validate(connection)


@router.post("/snowflake", response_model=SnowflakeConnectionModel)
def create_snowflake_connection(
    request: Request, connection_data: SnowflakeConnectionCreate
):
    db: Session = request.state.db
    connection_id = uuid6.uuid6()

    snowflake_connection = SnowflakeConnection(
        id=connection_id,
        name=connection_data.name,
        account=connection_data.account,
        user=connection_data.user,
        role=connection_data.role,
        database=connection_data.database,
        warehouse=connection_data.warehouse,
        schema=connection_data.schema_,
        private_key=connection_data.private_key,
    )
    try:
        snowflake_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Snowflake: {e}",
        )

    db.add(snowflake_connection)
    db.add(snowflake_connection.as_connection())
    db.commit()
    db.refresh(snowflake_connection)

    return SnowflakeConnectionModel.model_validate(snowflake_connection)


@router.put(
    "/snowflake/{connection_id}",
    response_model=SnowflakeConnectionModel,
)
def update_snowflake_connection(
    request: Request,
    connection_id: UUID,
    connection_data: SnowflakeConnectionUpdate,
):
    db: Session = request.state.db

    snowflake_connection = (
        db.query(SnowflakeConnection)
        .filter(SnowflakeConnection.id == connection_id)
        .first()
    )

    if not snowflake_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snowflake connection not found",
        )

    update_data = connection_data.model_dump(exclude_unset=True)
    if "schema_" in update_data:
        update_data["schema"] = update_data.pop("schema_")

    for key, value in update_data.items():
        if value is not None:
            setattr(snowflake_connection, key, value)

    try:
        snowflake_connection.check_connection()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to Snowflake with updated credentials: {e}",
        )

    db.commit()
    db.refresh(snowflake_connection)

    return SnowflakeConnectionModel.model_validate(snowflake_connection)


@router.delete(
    "/snowflake/{connection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_snowflake_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    specific_connection = (
        db.query(SnowflakeConnection)
        .options(joinedload(SnowflakeConnection.connection))
        .filter(SnowflakeConnection.id == connection_id)
        .first()
    )

    if not specific_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Snowflake connection not found",
        )

    specific_connection.connection.soft_delete()
    db.delete(specific_connection)
    db.commit()
