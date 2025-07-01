import uuid
from datetime import datetime

import uuid6
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from openfoundry.models.apps import App

router = APIRouter(prefix="/api")


# Pydantic models for request/response
class AppCreate(BaseModel):
    name: str


class AppModel(BaseModel):
    id: uuid.UUID
    name: str
    created_on: datetime
    updated_on: datetime

    class Config:
        from_attributes = True


@router.post("/apps", response_model=AppModel, status_code=status.HTTP_201_CREATED)
async def create_app(request: Request, app_data: AppCreate):
    """Create a new app."""
    db: Session = request.state.db

    # Create new app
    app = App(id=uuid6.uuid6(), name=app_data.name)

    db.add(app)
    db.commit()
    db.refresh(app)

    return AppModel.model_validate(app)


@router.get("/apps", response_model=list[AppModel])
async def get_apps(request: Request):
    """Get all apps."""
    db: Session = request.state.db

    # Get all apps ordered by created_on descending (newest first)
    apps = db.query(App).order_by(App.created_on.desc()).all()

    return [AppModel.model_validate(app) for app in apps]


@router.get("/apps/{app_id}", response_model=AppModel)
async def get_app(app_id: uuid.UUID, request: Request):
    """Get a specific app."""
    db: Session = request.state.db

    # Get the specific app
    app = db.query(App).filter(App.id == app_id).first()

    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"App with id {app_id} not found",
        )

    return AppModel.model_validate(app)
