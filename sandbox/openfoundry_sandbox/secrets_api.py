import os
import shutil
from pathlib import Path
from typing import Dict, Optional

from fastapi import APIRouter, Body
from pydantic import BaseModel, Field

from openfoundry_sandbox.config import SECRETS_BASE

router = APIRouter(prefix="/secrets", tags=["secrets"])


class SecretPayload(BaseModel):
    prefix: Optional[str] = Field(
        None, description="Optional prefix for the secret path"
    )
    name: str = Field(..., description="Secret name")
    secrets: Dict[str, str] = Field(..., description="Key-value pairs for the secret")


def get_secret_dir(prefix: Optional[str], name: str) -> Path:
    if prefix:
        return SECRETS_BASE / prefix / name
    return SECRETS_BASE / name


def store_secret(payload: SecretPayload):
    secret_dir = get_secret_dir(payload.prefix, payload.name)
    # Remove existing secret folder if it exists (replace)
    if secret_dir.exists():
        shutil.rmtree(secret_dir)
    secret_dir.mkdir(parents=True, exist_ok=True)
    for k, v in payload.secrets.items():
        key_path = secret_dir / k
        with open(key_path, "w", encoding="utf-8") as f:
            f.write(v)
    return secret_dir


@router.put("/")
def put_secret(payload: SecretPayload = Body(...)):
    secret_dir = store_secret(payload)
    return {
        "message": f"Secret '{payload.name}' stored successfully.",
        "path": str(secret_dir),
    }


@router.delete("/")
def delete_secret(prefix: str = Body(...), name: str = Body(...)):
    secret_dir = get_secret_dir(prefix, name)
    if secret_dir.exists():
        shutil.rmtree(secret_dir)
    return {
        "message": f"Secret '{name}' deleted (if existed).",
        "path": str(secret_dir),
    }


@router.get("/")
def list_secrets():
    """
    List all secret folders under /etc/secrets (recursively, showing prefix/name structure).
    """
    secrets = []
    if not SECRETS_BASE.exists():
        return secrets
    for root, dirs, _ in os.walk(SECRETS_BASE):
        # Only include leaf directories (those with files inside)
        for d in dirs:
            dir_path = Path(root) / d
            if any(dir_path.iterdir()):
                # Relative path from SECRETS_BASE
                rel_path = dir_path.relative_to(SECRETS_BASE)
                secrets.append(str(rel_path))
    return secrets
