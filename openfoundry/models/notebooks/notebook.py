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
    from openfoundry.models.notebooks.notebook_connection import NotebookConnection


class Notebook(Base):
    """Model representing a notebook."""

    __tablename__ = "notebooks"

    id: Mapped[uuid.UUID] = mapped_column(
        PostgresUUID, primary_key=True, default=uuid6.uuid6
    )
    name: Mapped[str] = mapped_column(nullable=False)
    deleted_on: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Association objects for the many-to-many relationship
    notebook_connections: Mapped[list["NotebookConnection"]] = relationship(
        "NotebookConnection", back_populates="notebook", cascade="all, delete-orphan"
    )

    def soft_delete(self):
        """Soft delete the notebook by setting deleted_on timestamp."""
        self.deleted_on = func.now()

    def initialize_notebook_workspace(self):
        """Initialize the workspace directory structure for this notebook with initial files.

        Creates: {storage_dir}/notebook/{notebook_id}/files/notebook.ipynb and utils.py
        """
        # Create the directory path
        notebook_dir = os.path.join(STORAGE_DIR, "notebook", str(self.id), "files")

        # Create directories (including parent directories)
        os.makedirs(notebook_dir, exist_ok=True)

        current_dir = Path(__file__).parent
        # Render and write notebook.ipynb
        notebook_template_path = os.path.join(
            current_dir, "..", "templates", "notebooks", "notebook.ipynb.j2"
        )
        with open(notebook_template_path, "r") as f:
            notebook_template_str = f.read()

        notebook_template = jinja2.Template(notebook_template_str)
        rendered_notebook_content = notebook_template.render()
        notebook_file = os.path.join(notebook_dir, "notebook.ipynb")
        with open(notebook_file, "w") as f:
            f.write(rendered_notebook_content)

        # Render and write utils.py
        utils_template_path = os.path.join(
            current_dir, "..", "templates", "shared", "utils.py.j2"
        )
        with open(utils_template_path, "r") as f:
            utils_template_str = f.read()

        utils_template = jinja2.Template(utils_template_str)
        rendered_utils_content = utils_template.render()
        utils_file = os.path.join(notebook_dir, "utils.py")
        with open(utils_file, "w") as f:
            f.write(rendered_utils_content)

    def get_workspace_directory(self):
        """Get the workspace directory for this notebook."""
        return os.path.join(STORAGE_DIR, "notebook", str(self.id), "files")

    def get_container_name(self):
        """Generate a container name based on the notebook's ID."""
        return f"notebook-{self.id}"

    def remove_deployment_in_docker(self):
        """Remove the Docker container associated with this notebook deployment."""
        container_name = self.get_container_name()
        logger.info(f"Cleaning up existing container for notebook {self.id}")

        # Stop the existing container
        stop_docker_container(container_name, ignore_not_found=True)
        logger.info(f"Stopped existing container {container_name}")

        # Remove the existing container
        remove_docker_container(container_name, ignore_not_found=True)
        logger.info(f"Removed existing container {container_name}")
