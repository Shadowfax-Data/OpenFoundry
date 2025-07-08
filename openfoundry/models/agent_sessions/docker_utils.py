import io
import json
import tarfile
import tempfile
from functools import cache
from pathlib import Path
from typing import NamedTuple

import docker

from openfoundry.logger import logger


class SecretPayload(NamedTuple):
    name: str
    secrets: dict[str, str]
    prefix: str | None = None


@cache
def get_docker_client() -> docker.DockerClient:
    """Get a cached Docker client instance.

    Returns:
        Docker client instance.

    """
    return docker.from_env()


def create_docker_container(
    docker_config: dict,
    initialization_data: dict,
    container_name: str,
    workspace_dir: str,
    command: str | None = None,
    working_dir: str | None = None,
    auto_remove: bool = False,
    secrets: list[SecretPayload] | None = None,
) -> tuple[str, dict[str, int]]:
    """Create Docker container for an agent session.

    Args:
        docker_config: Docker configuration dict with image, ports, etc.
        initialization_data: Data to be stored as environment variables.
        container_name: Name for the Docker container.
        workspace_dir: Workspace directory to copy to container.
        command: Command to run in the container.
        working_dir: Working directory in the container.
        auto_remove: If True, the container will be removed after it stops.
        secrets: List of SecretPayload to materialize into /etc/secrets in the container.

    Returns:
        Tuple of (container_id, port_mappings).

    """
    docker_client = get_docker_client()

    env_vars = {
        "INITIALIZATION_DATA": json.dumps(initialization_data),
    }
    logger.info(f"Environment variables: {env_vars}")

    # Create and start the container
    container = docker_client.containers.run(
        image=docker_config["image"],
        ports=docker_config["ports"],
        detach=True,
        name=container_name,
        environment=env_vars,
        command=command,
        working_dir=working_dir,
        auto_remove=auto_remove,
    )
    # Get container information
    container.reload()  # Refresh container info to get port mapping
    container_id = container.id
    actual_container_name = container.name
    logger.info(
        f"Container ID: {container_id}, Container Name: {actual_container_name}"
    )

    # Get assigned ports
    port_mappings = {}
    for container_port in docker_config["ports"]:
        if container_port in container.ports:
            host_port = container.ports[container_port][0]["HostPort"]
            port_mappings[container_port] = int(host_port)
            logger.info(f"Assigned port for {container_port}: {host_port}")

    # Copy workspace files to container
    logger.info(f"Copying workspace files from {workspace_dir} to container /workspace")
    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode="w") as t:
        t.add(str(workspace_dir), arcname=".")
    tar_stream.seek(0)
    container.put_archive("/workspace", tar_stream.read())
    logger.info("Successfully copied workspace files to container")

    # If secrets are provided, materialize and copy them to /etc/secrets
    if secrets:
        logger.info("Materializing secrets and copying to container /etc/secrets")
        with tempfile.TemporaryDirectory() as tmp_secrets_dir:
            tmp_secrets_path = Path(tmp_secrets_dir)
            materialize_secrets(secrets, base_dir=tmp_secrets_path)
            # Tar up the secrets dir
            tar_bytes = io.BytesIO()
            with tarfile.open(fileobj=tar_bytes, mode="w") as t:
                for item in tmp_secrets_path.rglob("*"):
                    t.add(str(item), arcname=str(item.relative_to(tmp_secrets_path)))
            tar_bytes.seek(0)
            container.put_archive("/etc/secrets", tar_bytes.read())
        logger.info("Successfully copied secrets to container /etc/secrets")

    # Return container information
    return container_id, port_mappings


def export_workspace_from_container(
    container_id: str, local_workspace_dir: str, container_path: str = "/workspace"
) -> None:
    """Export files from a Docker container directory to the local filesystem.

    Args:
        container_id: The ID of the container to export from.
        local_workspace_dir: Local directory to save the exported files.
        container_path: Path in the container to export from (default: "/workspace").

    """
    try:
        docker_client = get_docker_client()
        container = docker_client.containers.get(container_id)

        logger.info(
            f"Exporting files from container {container_id}:{container_path} to {local_workspace_dir}"
        )

        # Get the tar archive from the specified container directory
        tar_stream, _ = container.get_archive(container_path)

        # Create a BytesIO object from the tar stream
        tar_data = io.BytesIO()
        for chunk in tar_stream:
            tar_data.write(chunk)
        tar_data.seek(0)

        # Extract the tar archive to the local directory
        # We need to extract only the contents of the container directory, not the directory itself
        container_dir_name = container_path.strip("/").split("/")[-1]
        with tarfile.open(fileobj=tar_data, mode="r") as tar:
            # Get all members and filter out the container directory itself
            members = tar.getmembers()
            for member in members:
                if member.name == container_dir_name and member.isdir():
                    continue
                # Remove the container directory prefix from the path
                prefix = f"{container_dir_name}/"
                if member.name.startswith(prefix):
                    member.name = member.name[len(prefix) :]
                    tar.extract(member, path=local_workspace_dir)

        logger.info(
            f"Successfully exported files from container {container_id}:{container_path} to {local_workspace_dir}"
        )

    except docker.errors.NotFound:
        logger.error(f"Container {container_id} not found")
        raise
    except Exception as e:
        logger.error(
            f"Failed to export workspace from container {container_id}: {str(e)}"
        )
        raise


def start_docker_container(container_name: str) -> tuple[str, dict[str, int]]:
    """Start a Docker container by its name and return container information.

    Args:
        container_name: Name of the Docker container to start.

    Returns:
        Tuple of (container_id, port_mappings).

    """
    docker_client = get_docker_client()

    container = docker_client.containers.get(container_name)
    logger.info(f"Starting Docker container {container_name}")
    container.start()
    logger.info(f"Docker container {container_name} started successfully")

    # Get container information
    container.reload()  # Refresh container info to get port mapping
    container_id = container.id
    actual_container_name = container.name
    logger.info(
        f"Container ID: {container_id}, Container Name: {actual_container_name}"
    )

    # Get assigned ports
    port_mappings = {}
    if container.ports:
        for container_port, host_ports in container.ports.items():
            if host_ports:
                host_port = host_ports[0]["HostPort"]
                port_mappings[container_port] = int(host_port)
                logger.info(f"Assigned port for {container_port}: {host_port}")

    # Return container information
    return container_id, port_mappings


def stop_docker_container(container_name: str, ignore_not_found: bool = False) -> None:
    """Stop a Docker container by its ID.

    Args:
        container_name: The ID of the container to stop
        ignore_not_found: If True, do not raise an error if the container is not found

    """
    try:
        docker_client = get_docker_client()
        container = docker_client.containers.get(container_name)
        logger.info(f"Stopping Docker container {container_name}")
        container.stop()
        logger.info(f"Docker container {container_name} stopped successfully")
    except docker.errors.NotFound:
        if not ignore_not_found:
            logger.warning(
                f"Container {container_name} not found, updating status anyway"
            )
            raise


def remove_docker_container(
    container_name: str, ignore_not_found: bool = False
) -> None:
    """Remove a Docker container by its ID.

    Args:
        container_name: The ID of the container to remove
        ignore_not_found: If True, do not raise an error if the container is not found

    """
    try:
        docker_client = get_docker_client()
        container = docker_client.containers.get(container_name)
        logger.info(f"Removing Docker container {container_name}")
        container.remove()
        logger.info(f"Docker container {container_name} removed successfully")
    except docker.errors.NotFound:
        if not ignore_not_found:
            logger.warning(
                f"Container {container_name} not found, updating status anyway"
            )
            raise


def container_exists(container_id: str) -> bool:
    """Check if a Docker container exists by its ID.

    Args:
        container_id: The ID of the container to check.

    Returns:
        True if container exists, False otherwise.

    """
    try:
        docker_client = get_docker_client()
        docker_client.containers.get(container_id)
        return True
    except docker.errors.NotFound:
        return False


# --- Secret Materialization Logic ---
def materialize_secrets(
    secrets: list[SecretPayload], base_dir: Path = Path("/etc/secrets")
):
    """Materialize a list of SecretPayloads into the file system under /etc/secrets.

    Each secret is a folder, each key is a file with the value as content.
    """
    for secret in secrets:
        if secret.prefix:
            secret_dir = base_dir / secret.prefix / secret.name
        else:
            secret_dir = base_dir / secret.name
        secret_dir.mkdir(parents=True, exist_ok=True)
        for k, v in secret.secrets.items():
            key_path = secret_dir / k
            with open(key_path, "w", encoding="utf-8") as f:
                f.write(v)
