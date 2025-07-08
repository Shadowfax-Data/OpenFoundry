import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

import uuid6
from jinja2 import Environment, FileSystemLoader
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.config import STORAGE_DIR
from openfoundry.database import Base
from openfoundry.models.apps.app_connection import app_connection

if TYPE_CHECKING:
    from openfoundry.models.connections import Connection


class App(Base):
    """Model representing an application."""

    __tablename__ = "apps"

    id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID, primary_key=True, default=uuid6.uuid6
    )
    name: Mapped[str] = mapped_column(nullable=False)
    deleted_on: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deployment_port: Mapped[int | None] = mapped_column(nullable=True)

    connections: Mapped[list["Connection"]] = relationship(
        "Connection", secondary=app_connection
    )

    def soft_delete(self):
        """Soft delete the app by setting deleted_on timestamp."""
        self.deleted_on = func.now()

    def initialize_app_workspace(self):
        """Initialize the workspace directory structure for this app with initial files.

        Creates: {storage_dir}/app/{app_id}/files/app.py inside the openfoundry root directory
        """
        # Create the directory path
        app_dir = os.path.join(STORAGE_DIR, "app", str(self.id), "files")

        # Create directories (including parent directories)
        os.makedirs(app_dir, exist_ok=True)

        # Create the app.py file inside the files directory
        app_file = os.path.join(app_dir, "app.py")

        # Setup Jinja2 environment
        template_dir = Path(__file__).parent
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template("app.py.j2")

        # Render the template with app context
        rendered_content = template.render()

        # Write the rendered content to app.py
        with open(app_file, "w") as f:
            f.write(rendered_content)

    def get_workspace_directory(self):
        """Get the workspace directory for this app."""
        return os.path.join(STORAGE_DIR, "app", str(self.id), "files")

    def get_container_name(self):
        """Generate a container name based on the app's ID."""
        return f"app-{self.id}"
