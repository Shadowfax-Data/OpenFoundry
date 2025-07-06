import json
import logging
import os
import subprocess
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.responses import JSONResponse
from openhands_aci.editor import OHEditor
from openhands_aci.editor.results import CLIResult
from pydantic import BaseModel, Field

from openfoundry_sandbox.files_api import router as files_api_router
from openfoundry_sandbox.find_api import router as find_api_router
from openfoundry_sandbox.pcb_api import RunRequest, run_process_core
from openfoundry_sandbox.pcb_api import router as pcb_api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


# --- Pydantic Models ---


class RunConfig(BaseModel):
    """Configuration for starting a process during initialization."""

    identifier: str = Field(..., description="Unique identifier for the process")
    command_str: str = Field(..., description="The command to run the process")
    cwd: str = Field(..., description="Working directory for the process")


class InitializeRequest(BaseModel):
    """Configuration for initializing the sandbox server."""

    file_templates: dict[str, str] | None = Field(
        None, description="The file templates to use"
    )
    streamlit_run_config: RunConfig | None = Field(
        None, description="Streamlit configuration for starting apps"
    )


class StrReplaceEditorRequest(BaseModel):
    command: Literal["view", "create", "str_replace", "insert", "undo_edit"]
    path: str
    file_text: str | None = None
    view_range: list[int] | None = None
    old_str: str | None = None
    new_str: str | None = None
    insert_line: int | None = None


class StrReplaceEditorResponse(BaseModel):
    output: str | None = None
    error: str | None = None
    path: str | None = None
    prev_exist: bool | None = None
    old_content: str | None = None
    new_content: str | None = None

    class Config:
        from_attributes = True


editor = OHEditor(workspace_root="/workspace")


# File Operations
class WriteFileRequest(BaseModel):
    file_path: str
    content: str


class ListFilesResponse(BaseModel):
    files: list[str]
    directories: list[str]


# Shell Execution
class RunShellRequest(BaseModel):
    command_str: str
    cwd: str = "/workspace"
    timeout_seconds: int = 300


class RunShellResponse(BaseModel):
    stdout: str
    stderr: str
    timeout: bool = False
    return_code: int | None = None


# --- API Endpoints ---


async def initialize_from_env():
    """Initialize the sandbox server using data from environment variables."""
    initialization_data_str = os.environ.get("INITIALIZATION_DATA")
    if not initialization_data_str:
        logger.warning("No INITIALIZATION_DATA found in environment variables")
        return

    logger.info("Initializing sandbox server from INITIALIZATION_DATA")
    initialization_data = json.loads(initialization_data_str)

    request = InitializeRequest.model_validate(initialization_data)
    await _perform_initialization(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize from environment variables first
    try:
        await initialize_from_env()
    except Exception as e:
        logger.error(f"Failed to initialize from environment data: {e}")

    yield


app = FastAPI(lifespan=lifespan)

app.include_router(pcb_api_router)
app.include_router(find_api_router)
app.include_router(files_api_router)


@app.get("/health")
def health():
    return {"message": "Action execution server is running."}


@app.post("/initialize")
async def initialize(request: InitializeRequest):
    """Initialize the sandbox server with file templates and optional streamlit app."""
    if getattr(app.state, "initialized", False):
        logger.info("Service already initialized.")
        return JSONResponse(
            status_code=status.HTTP_208_ALREADY_REPORTED,
            content={"initialized": app.state.initialized},
        )

    await _perform_initialization(request)
    return {"initialized": app.state.initialized}


# Editor Endpoint
@app.post("/str_replace_editor", response_model=StrReplaceEditorResponse)
def str_replace_editor(request: StrReplaceEditorRequest):
    """
    Run a command from the OHEditor.
    """
    try:
        result: CLIResult = editor(
            command=request.command,
            path=request.path,
            file_text=request.file_text,
            view_range=request.view_range,
            old_str=request.old_str,
            new_str=request.new_str,
            insert_line=request.insert_line,
        )
        return StrReplaceEditorResponse.model_validate(result)
    except Exception as e:
        logger.error(f"Error executing editor command: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# File Operation Endpoints
@app.post("/write_file")
def write_file(req: WriteFileRequest):
    """
    Write the file at the given path with the provided content.
    """
    logger.info(
        f"Received write_file request: file_path='{req.file_path}', content_length={len(req.content)}"
    )
    if not os.path.isabs(req.file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File path must be absolute"
        )

    # Create parent directories if they don't exist
    parent_dir = os.path.dirname(req.file_path)
    if parent_dir and not os.path.exists(parent_dir):
        try:
            os.makedirs(parent_dir, exist_ok=True)
            logger.info(f"Created parent directories for: {req.file_path}")
        except Exception as e:
            logger.error(f"Failed to create parent directories: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create parent directories: {e}",
            )

    try:
        with open(req.file_path, "w", encoding="utf-8") as f:
            f.write(req.content)
        logger.info(f"Successfully wrote file: {req.file_path}")
        return {"message": f"File written successfully to {req.file_path}"}
    except Exception as e:
        logger.error(f"Failed to write file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file: {e}",
        )


@app.get("/read_file")
def read_file(file_path: str = Query(..., description="Absolute file path")):
    """
    Read the content of a file.
    """
    logger.info(f"Received read_file request: file_path='{file_path}'")
    if not os.path.isabs(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File path must be absolute"
        )
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )
    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Path is not a file"
        )

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        logger.info(f"Successfully read file: {file_path}")
        return {"file_path": file_path, "content": content}
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file: {e}",
        )


def find_all_files(roots: list[str]) -> list[str]:
    """
    Given a list of root directories (absolute paths),
    return a flat list of all file absolute paths under them.
    """
    all_files: list[str] = []
    for root in roots:
        root_path = Path(root)
        for p in root_path.rglob("*"):
            if p.is_file():
                all_files.append(str(p.resolve()))
    return all_files


@app.get("/list_files")
def list_files() -> dict:
    """
    List all available files under the workspace directory.
    """
    default_roots = ["/workspace"]
    files = find_all_files(default_roots)
    return {"files": files}


@app.post("/run_shell", response_model=RunShellResponse)
def run_shell(request: RunShellRequest):
    """
    Execute a shell command and return the result.
    """
    logger.info(
        f"Received run_shell request: command='{request.command_str}', cwd='{request.cwd}'"
    )

    if not os.path.isabs(request.cwd):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Working directory must be absolute",
        )

    try:
        # Run the command with timeout
        result = subprocess.run(
            request.command_str,
            shell=True,
            capture_output=True,
            text=True,
            cwd=request.cwd,
            timeout=request.timeout_seconds,
        )

        response = RunShellResponse(
            stdout=result.stdout,
            stderr=result.stderr,
            return_code=result.returncode,
            timeout=False,
        )

        logger.info(
            f"Shell command completed: return_code={result.returncode}, stdout_length={len(result.stdout)}, stderr_length={len(result.stderr)}"
        )
        return response

    except subprocess.TimeoutExpired as e:
        logger.warning(f"Shell command timed out after {request.timeout_seconds}s")
        return RunShellResponse(
            stdout=e.stdout or "",
            stderr=e.stderr or "",
            timeout=True,
            return_code=None,
        )
    except Exception as e:
        logger.error(f"Failed to execute shell command: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute command: {e}",
        )


# --- Helper Functions ---


async def _perform_initialization(request: InitializeRequest):
    """Perform initialization including file templates and streamlit startup."""

    # Handle streamlit startup if streamlit_run_config is present
    if request.streamlit_run_config:
        logger.info("Starting streamlit app")

        # Get active processes directly from app state
        if not hasattr(app.state, "active_processes"):
            logger.info(
                "Creating new active_processes dictionary - app state was empty"
            )
            app.state.active_processes = {}
        else:
            logger.info(
                f"Found existing active_processes with {len(app.state.active_processes)} processes: {list(app.state.active_processes.keys())}"
            )
        active_processes = app.state.active_processes

        run_request = RunRequest(
            identifier=request.streamlit_run_config.identifier,
            command_str=request.streamlit_run_config.command_str,
            cwd=request.streamlit_run_config.cwd,
        )

        try:
            response = await run_process_core(run_request, active_processes)
            logger.info(
                f"Successfully started streamlit app: {response.identifier}, PID: {response.pid}"
            )
        except Exception as e:
            logger.error(f"Failed to start streamlit app: {e}")
            raise

    app.state.initialized = True
    logger.info("Sandbox server initialization completed successfully")
