import io
import json
import tarfile
from functools import cache

import docker

from openfoundry.logger import logger


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
) -> tuple[str, dict[str, int]]:
    """Create Docker container for an agent session.

    Args:
        docker_config: Docker configuration dict with image, ports, etc.
        initialization_data: Data to be stored as environment variables.
        container_name: Name for the Docker container.
        workspace_dir: Workspace directory to copy to container.

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

    # Return container information
    return container_id, port_mappings


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


def stop_docker_container(container_id: str, ignore_not_found: bool = False) -> None:
    """Stop a Docker container by its ID.

    Args:
        container_id: The ID of the container to stop
        ignore_not_found: If True, do not raise an error if the container is not found

    """
    try:
        docker_client = get_docker_client()
        container = docker_client.containers.get(container_id)
        logger.info(f"Stopping Docker container {container_id}")
        container.stop()
        logger.info(f"Docker container {container_id} stopped successfully")
    except docker.errors.NotFound:
        if not ignore_not_found:
            logger.warning(
                f"Container {container_id} not found, updating status anyway"
            )
            raise


def remove_docker_container(container_id: str, ignore_not_found: bool = False) -> None:
    """Remove a Docker container by its ID.

    Args:
        container_id: The ID of the container to remove
        ignore_not_found: If True, do not raise an error if the container is not found

    """
    try:
        docker_client = get_docker_client()
        container = docker_client.containers.get(container_id)
        logger.info(f"Removing Docker container {container_id}")
        container.remove()
        logger.info(f"Docker container {container_id} removed successfully")
    except docker.errors.NotFound:
        if not ignore_not_found:
            logger.warning(
                f"Container {container_id} not found, updating status anyway"
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
