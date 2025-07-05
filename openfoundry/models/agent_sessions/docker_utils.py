import io
import json
import tarfile
from functools import cache

import docker

from openfoundry.config import SANDBOX_PORT
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
) -> dict:
    """Create Docker container for an agent session.

    Args:
        docker_config: Docker configuration dict with image, ports, agent, etc.
        initialization_data: Data to be stored as environment variables.
        container_name: Name for the Docker container.
        workspace_dir: Workspace directory to copy to container.

    Returns:
        Dict containing container_id, assigned_sandbox_port, port_mappings, and agent.

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

    # Get the main sandbox port
    sandbox_port_key = f"{SANDBOX_PORT}/tcp"
    assigned_sandbox_port = port_mappings[sandbox_port_key]

    # Copy workspace files to container
    logger.info(f"Copying workspace files from {workspace_dir} to container /workspace")
    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode="w") as t:
        t.add(str(workspace_dir), arcname=".")
    tar_stream.seek(0)
    container.put_archive("/workspace", tar_stream.read())
    logger.info("Successfully copied workspace files to container")

    # Return container information
    result = {
        "container_id": container_id,
        "assigned_sandbox_port": assigned_sandbox_port,
        "port_mappings": port_mappings,
        "agent": docker_config["agent"],
    }

    return result
