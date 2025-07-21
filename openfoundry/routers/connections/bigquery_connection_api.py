from uuid import UUID

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from openfoundry.models.connections.bigquery_connection import BigQueryConnection
from openfoundry.models.connections.connection import Connection

router = APIRouter(prefix="/api/connections")


class BigQueryConnectionCreate(BaseModel):
    name: str
    service_account_key: str
    project_id: str
    dataset_id: str


class BigQueryConnectionUpdate(BaseModel):
    name: str | None = None
    service_account_key: str | None = None
    project_id: str | None = None
    dataset_id: str | None = None


class BigQueryConnectionModel(BaseModel):
    id: UUID
    name: str
    service_account_key: str
    project_id: str
    dataset_id: str | None = None
    type: str

    class Config:
        from_attributes = True


@router.get("/bigquery/{connection_id}", response_model=BigQueryConnectionModel)
def get_big_query_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    connection = (
        db.query(BigQueryConnection)
        .filter(BigQueryConnection.id == connection_id)
        .first()
    )

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found"
        )

    setattr(connection, "type", connection.type.value)
    return BigQueryConnectionModel.model_validate(connection)


@router.post("/bigquery", response_model=BigQueryConnectionModel)
def create_big_query_connection(
    request: Request, connection_data: BigQueryConnectionCreate
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

    bigquery_connection = BigQueryConnection(
        id=connection_id,
        name=connection_data.name,
        service_account_key=connection_data.service_account_key,
        project_id=connection_data.project_id,
        dataset_id=connection_data.dataset_id,
    )

    try:
        bigquery_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to BigQuery: {e}",
        )

    db.add(bigquery_connection)
    db.add(bigquery_connection.as_connection())
    db.commit()
    db.refresh(bigquery_connection)

    setattr(bigquery_connection, "type", bigquery_connection.type.value)
    return BigQueryConnectionModel.model_validate(bigquery_connection)


@router.put("/bigquery/{connection_id}", response_model=BigQueryConnectionModel)
def update_big_query_connection(
    request: Request, connection_id: UUID, connection_data: BigQueryConnectionUpdate
):
    db: Session = request.state.db

    bigquery_connection = (
        db.query(BigQueryConnection)
        .filter(BigQueryConnection.id == connection_id)
        .first()
    )

    if not bigquery_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found"
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

    for field, value in update_data.items():
        setattr(bigquery_connection, field, value)

    bigquery_connection.connection.name = bigquery_connection.name

    try:
        bigquery_connection.check_connection()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect to BigQuery: {e}",
        )

    db.commit()
    db.refresh(bigquery_connection)

    setattr(bigquery_connection, "type", bigquery_connection.type.value)
    return BigQueryConnectionModel.model_validate(bigquery_connection)


@router.delete("/bigquery/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_big_query_connection(request: Request, connection_id: UUID):
    db: Session = request.state.db

    specific_connection = (
        db.query(BigQueryConnection)
        .options(joinedload(BigQueryConnection.connection))
        .filter(BigQueryConnection.id == connection_id)
        .first()
    )

    if not specific_connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found"
        )

    specific_connection.connection.soft_delete()
    db.delete(specific_connection)
    db.commit()
