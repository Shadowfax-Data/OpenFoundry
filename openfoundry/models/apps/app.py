import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

import jinja2
import uuid6
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from openfoundry.config import STORAGE_DIR
from openfoundry.database import Base
from openfoundry.logger import logger
from openfoundry.models.agent_sessions.docker_utils import (
    remove_docker_container,
    stop_docker_container,
)

if TYPE_CHECKING:
    from openfoundry.models.apps.app_connection import AppConnection


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

    # Association objects for the many-to-many relationship
    app_connections: Mapped[list["AppConnection"]] = relationship(
        "AppConnection", back_populates="app", cascade="all, delete-orphan"
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

        current_dir = Path(__file__).parent

        # Render and write utils.py
        utils_template_path = os.path.join(
            current_dir, "..", "templates", "shared", "utils.py.j2"
        )
        with open(utils_template_path, "r") as f:
            utils_template_str = f.read()

        utils_template = jinja2.Template(utils_template_str)
        rendered_utils_content = utils_template.render()
        utils_file = os.path.join(app_dir, "utils.py")
        with open(utils_file, "w") as f:
            f.write(rendered_utils_content)

        # Render and write app.py
        app_template_path = os.path.join(
            current_dir, "..", "templates", "apps", "app.py.j2"
        )
        with open(app_template_path, "r") as f:
            app_template_str = f.read()

        app_template = jinja2.Template(app_template_str)
        rendered_app_content = app_template.render()
        app_file = os.path.join(app_dir, "app.py")
        with open(app_file, "w") as f:
            f.write(rendered_app_content)

    def get_workspace_directory(self):
        """Get the workspace directory for this app."""
        return os.path.join(STORAGE_DIR, "app", str(self.id), "files")

    def get_container_name(self):
        """Generate a container name based on the app's ID."""
        return f"app-{self.id}"

    def remove_deployment_in_docker(self):
        """Remove the Docker container associated with this app deployment."""
        if self.deployment_port:
            container_name = self.get_container_name()
            logger.info(
                f"Cleaning up existing container for app {self.id} with deployment port {self.deployment_port}"
            )

            # Stop the existing container
            stop_docker_container(container_name, ignore_not_found=True)
            logger.info(f"Stopped existing container {container_name}")

            # Remove the existing container
            remove_docker_container(container_name, ignore_not_found=True)
            logger.info(f"Removed existing container {container_name}")
