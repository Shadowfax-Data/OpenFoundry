import base64
import logging
import mimetypes
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/files", tags=["files"])


class DirectoryEntry(BaseModel):
    """Represents a file or directory entry."""

    name: str
    path: str
    is_directory: bool
    modified_time: float | None = None
    is_binary: bool | None = None


class DirectoryListing(BaseModel):
    """Response model for directory listing."""

    path: str
    entries: list[DirectoryEntry]
    parent_path: str | None = None


class FileInfo(BaseModel):
    """Information about a file."""

    path: str
    name: str
    size: int
    is_directory: bool
    modified_time: float
    mime_type: str | None = None


class WriteFileRequest(BaseModel):
    """Request model for writing a file."""

    path: str = Field(..., description="Absolute path to the file")
    content: str = Field(..., description="File content")
    encoding: str = Field("utf-8", description="File encoding")


class WriteBinaryFileRequest(BaseModel):
    """Request model for writing a binary file."""

    path: str = Field(..., description="Absolute path to the file")
    content: str = Field(..., description="Base64 encoded binary content")


# --- Helper Functions ---


def is_safe_path(path: str) -> bool:
    """Check if the path is safe (doesn't contain dangerous patterns and is not a large file)."""
    try:
        # Require absolute path
        if not os.path.isabs(path):
            return False

        # Check for dangerous patterns
        dangerous_patterns = ["..", "~", "/proc", "/sys", "/dev"]
        for pattern in dangerous_patterns:
            if pattern in path:
                return False

        # Disallow large files
        if os.path.isfile(path) and os.path.getsize(path) > MAX_FILE_SIZE:
            return False
        return True
    except Exception:
        return False


def get_file_info(file_path: str) -> FileInfo:
    """Get information about a file."""
    path_obj = Path(file_path)
    stat = path_obj.stat()

    mime_type = None
    if path_obj.is_file():
        mime_type, _ = mimetypes.guess_type(str(path_obj))

    return FileInfo(
        path=str(path_obj),
        name=path_obj.name,
        size=stat.st_size,
        is_directory=path_obj.is_dir(),
        modified_time=stat.st_mtime,
        mime_type=mime_type,
    )


def is_text_file(file_path: str) -> bool:
    """Determine if a file is likely a text file."""
    try:
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type:
            return mime_type.startswith("text/")

        # Check file extension for common text files
        text_extensions = {
            ".bash",
            ".c",
            ".cfg",
            ".clj",
            ".conf",
            ".cpp",
            ".cs",
            ".css",
            ".dart",
            ".fish",
            ".fs",
            ".go",
            ".h",
            ".hpp",
            ".hs",
            ".html",
            ".ini",
            ".java",
            ".js",
            ".json",
            ".jsx",
            ".kt",
            ".lua",
            ".md",
            ".ml",
            ".php",
            ".pl",
            ".pm",
            ".py",
            ".r",
            ".rb",
            ".rs",
            ".scala",
            ".sh",
            ".sql",
            ".swift",
            ".toml",
            ".ts",
            ".tsx",
            ".txt",
            ".xml",
            ".yaml",
            ".yml",
            ".zsh",
        }
        return Path(file_path).suffix.lower() in text_extensions
    except Exception:
        return False


# --- API Endpoints ---


@router.get("/list", response_model=DirectoryListing)
def list_directory(
    path: str = Query(".", description="Directory path to list"),
    include_hidden: bool = Query(
        False, description="Include hidden files and directories"
    ),
):
    """
    List contents of a directory.
    """
    logger.info(f"Listing directory: {path}")

    if not is_safe_path(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found"
        )

    if not os.path.isdir(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Path is not a directory"
        )

    entries = []
    path_obj = Path(path)

    for item in path_obj.iterdir():
        # Skip hidden files unless requested
        if not include_hidden and item.name.startswith("."):
            continue

        try:
            stat = item.stat()
            is_binary = None
            if item.is_file():
                is_binary = not is_text_file(str(item))

            entry = DirectoryEntry(
                name=item.name,
                path=str(item),
                is_directory=item.is_dir(),
                modified_time=stat.st_mtime,
                is_binary=is_binary,
            )
            entries.append(entry)
        except (OSError, PermissionError) as e:
            logger.warning(f"Could not access {item}: {e}")
            # Still include the entry but without modified time and binary info
            entry = DirectoryEntry(
                name=item.name, path=str(item), is_directory=item.is_dir()
            )
            entries.append(entry)

    # Sort: directories first, then files, both alphabetically
    entries.sort(key=lambda x: (not x.is_directory, x.name.lower()))

    # Get parent path
    parent_path = str(path_obj.parent) if path_obj.parent != path_obj else None

    return DirectoryListing(path=path, entries=entries, parent_path=parent_path)


@router.get("/read")
def read_file(
    path: str = Query(..., description="File path to read"),
    encoding: str = Query("utf-8", description="File encoding for text files"),
):
    """
    Read a file. Returns text content for text files, base64 encoded content for binary files.
    """
    logger.info(f"Reading file: {path}")

    if not is_safe_path(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    if not os.path.isfile(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Path is not a file"
        )

    file_info = get_file_info(path)

    if is_text_file(path):
        # Read as text
        try:
            with open(path, "r", encoding=encoding) as f:
                content = f.read()
            return {
                "path": path,
                "content": content,
                "is_binary": False,
                "encoding": encoding,
                "file_info": file_info,
            }
        except UnicodeDecodeError:
            # If text decoding fails, treat as binary
            logger.warning(f"Failed to decode {path} as text, treating as binary")
            with open(path, "rb") as f:
                content = base64.b64encode(f.read()).decode("ascii")
            return {
                "path": path,
                "content": content,
                "is_binary": True,
                "encoding": None,
                "file_info": file_info,
            }
    else:
        # Read as binary
        with open(path, "rb") as f:
            content = base64.b64encode(f.read()).decode("ascii")
        return {
            "path": path,
            "content": content,
            "is_binary": True,
            "encoding": None,
            "file_info": file_info,
        }


@router.get("/download")
def download_file(path: str = Query(..., description="File path to download")):
    """
    Download a file directly (for binary files or large files).
    """
    logger.info(f"Downloading file: {path}")

    if not is_safe_path(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    if not os.path.isfile(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Path is not a file"
        )

    return FileResponse(
        path=path,
        filename=os.path.basename(path),
        media_type=mimetypes.guess_type(path)[0],
    )


@router.post("/write")
def write_file(request: WriteFileRequest):
    """
    Write text content to a file.
    """
    logger.info(f"Writing text file: {request.path}")

    if not is_safe_path(request.path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    # Create parent directories if they don't exist
    parent_dir = os.path.dirname(request.path)
    if parent_dir and not os.path.exists(parent_dir):
        os.makedirs(parent_dir, exist_ok=True)
        logger.info(f"Created parent directories for: {request.path}")

    with open(request.path, "w", encoding=request.encoding) as f:
        f.write(request.content)

    file_info = get_file_info(request.path)
    logger.info(f"Successfully wrote text file: {request.path}")

    return {
        "message": f"File written successfully to {request.path}",
        "file_info": file_info,
    }


@router.post("/write_binary")
def write_binary_file(request: WriteBinaryFileRequest):
    """
    Write binary content to a file.
    """
    logger.info(f"Writing binary file: {request.path}")

    if not is_safe_path(request.path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    # Create parent directories if they don't exist
    parent_dir = os.path.dirname(request.path)
    if parent_dir and not os.path.exists(parent_dir):
        os.makedirs(parent_dir, exist_ok=True)
        logger.info(f"Created parent directories for: {request.path}")

    # Decode base64 content
    binary_content = base64.b64decode(request.content)

    with open(request.path, "wb") as f:
        f.write(binary_content)

    file_info = get_file_info(request.path)
    logger.info(f"Successfully wrote binary file: {request.path}")

    return {
        "message": f"Binary file written successfully to {request.path}",
        "file_info": file_info,
    }


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    path: str = Query(..., description="Target path for the uploaded file"),
):
    """
    Upload a file using multipart form data.
    """
    logger.info(f"Uploading file to: {path}")

    if not is_safe_path(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    # Create parent directories if they don't exist
    parent_dir = os.path.dirname(path)
    if parent_dir and not os.path.exists(parent_dir):
        os.makedirs(parent_dir, exist_ok=True)
        logger.info(f"Created parent directories for: {path}")

    # Write the uploaded file
    with open(path, "wb") as f:
        content = await file.read()
        f.write(content)

    file_info = get_file_info(path)
    logger.info(f"Successfully uploaded file: {path}")

    return {
        "message": f"File uploaded successfully to {path}",
        "original_filename": file.filename,
        "file_info": file_info,
    }


@router.get("/info")
def get_file_info_endpoint(
    path: str = Query(..., description="File path to get info for"),
):
    """
    Get information about a file or directory.
    """
    logger.info(f"Getting file info: {path}")

    if not is_safe_path(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File or directory not found"
        )
    return get_file_info(path)


@router.delete("/delete")
def delete_file(path: str = Query(..., description="File or directory path to delete")):
    """
    Delete a file or directory.
    """
    logger.info(f"Deleting: {path}")

    if not is_safe_path(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unsafe path"
        )

    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File or directory not found"
        )

    if os.path.isdir(path):
        shutil.rmtree(path)
        message = f"Directory deleted: {path}"
    else:
        os.remove(path)
        message = f"File deleted: {path}"

    logger.info(message)
    return {"message": message}
