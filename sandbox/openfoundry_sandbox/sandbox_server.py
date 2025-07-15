import io
import json
import logging
import os
import subprocess
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.responses import JSONResponse
from openhands_aci.editor import OHEditor
from openhands_aci.editor.results import CLIResult
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field

from openfoundry_sandbox.config import WORKSPACE_DIR
from openfoundry_sandbox.connection_manager import connection_manager
from openfoundry_sandbox.connections_api import router as connections_api_router
from openfoundry_sandbox.files_api import router as files_api_router
from openfoundry_sandbox.find_api import router as find_api_router
from openfoundry_sandbox.notebook_api import router as notebook_api_router
from openfoundry_sandbox.notebook_runner import initialize_kernel, shutdown_kernel
from openfoundry_sandbox.pcb_api import RunRequest, run_process_core
from openfoundry_sandbox.pcb_api import router as pcb_api_router
from openfoundry_sandbox.secrets_api import SecretPayload, store_secret
from openfoundry_sandbox.secrets_api import router as secrets_api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="[%(asctime)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
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
    secrets: list[SecretPayload] | None = Field(
        None, description="List of secrets to initialize in the container"
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


# SQL Execution
class ExecuteSqlRequest(BaseModel):
    sql_statement: str
    connection_name: str


class ExecuteSqlResponse(BaseModel):
    success: bool
    rows_affected: int
    data: list[dict]
    error: str | None = None


editor = OHEditor(workspace_root=WORKSPACE_DIR)


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
    cwd: str = WORKSPACE_DIR
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

    # Initialize the Jupyter kernel
    await initialize_kernel()
    yield
    # Shutdown the kernel on app shutdown
    await shutdown_kernel()

    # Cleanup connections on shutdown
    try:
        connection_manager.cleanup_connections()
        logger.info("Cleaned up all connections during shutdown")
    except Exception as e:
        logger.error(f"Error cleaning up connections during shutdown: {e}")


app = FastAPI(lifespan=lifespan)

app.include_router(pcb_api_router)
app.include_router(find_api_router)
app.include_router(files_api_router)
app.include_router(secrets_api_router)
app.include_router(connections_api_router)
app.include_router(notebook_api_router)


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
    default_roots = [WORKSPACE_DIR]
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


# Visualize App (Combined PDF capture + markdown conversion)
@app.post("/visualize_app")
def visualize_app():
    """
    Capture a web page as PDF and convert it to markdown text in one operation.
    """
    url = "localhost:8501"
    logger.info(f"Visualize App URL: {url!r}")

    # Step 1: Capture PDF using Playwright
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        page = browser.new_page()

        # Set a reasonable viewport size to ensure proper rendering
        page.set_viewport_size({"width": 1280, "height": 1024})

        page.goto(url, wait_until="domcontentloaded", timeout=30_000)

        # wait for network to settle - 30 seconds
        page.wait_for_load_state("networkidle", timeout=30_000)

        # Additional wait for dynamic content to fully initialize
        time.sleep(3.0)

        # Scroll to bottom to trigger lazy loading and ensure all content is loaded
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2.0)  # Wait for any lazy-loaded content

        # Scroll back to top for consistent starting point
        page.evaluate("window.scrollTo(0, 0)")

        # Final wait for everything to settle after scrolling
        time.sleep(2.0)

        # Generate PDF with options to capture full content
        pdf_bytes = page.pdf(
            format="A0",
            print_background=True,
            margin={
                "top": "0",
                "right": "0",
                "bottom": "0",
                "left": "0",
            },
        )
        browser.close()

    logger.info(f"Successfully captured PDF of {url}")

    # Step 2: Convert PDF to markdown using pdfminer
    pdf_stream = io.BytesIO(pdf_bytes)

    # Extract text using pdfminer with layout parameters for better formatting
    laparams = LAParams(
        line_margin=1.0,
        word_margin=0.5,
        char_margin=3.0,
        boxes_flow=0.5,
        all_texts=False,
    )

    extracted_text = extract_text(pdf_stream, laparams=laparams)

    # Basic markdown formatting
    # Split into lines and clean up
    lines = extracted_text.split("\n")
    markdown_lines = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Convert common patterns to markdown
        # Headers (lines that are all caps or start with common header patterns)
        if len(line) > 0 and (
            line.isupper()
            or any(
                line.startswith(prefix)
                for prefix in [
                    "Chapter",
                    "Section",
                    "Part",
                    "Introduction",
                    "Conclusion",
                ]
            )
        ):
            markdown_lines.append(f"## {line}")
        # Regular text
        else:
            markdown_lines.append(line)

    # Join with appropriate spacing
    markdown_text = "\n\n".join(markdown_lines)

    logger.info(
        f"Successfully converted PDF to markdown: {len(markdown_text)} characters"
    )
    return {"content": markdown_text.strip()}


# SQL Execution Endpoint
@app.post("/execute_sql", response_model=ExecuteSqlResponse)
def execute_sql(request: ExecuteSqlRequest):
    """
    Execute a SQL statement on a specified connection.
    """
    logger.info(
        f"Received execute_sql request: sql_statement='{request.sql_statement}', connection_name='{request.connection_name}'"
    )

    try:
        # Get the connection from the connection manager
        connection = connection_manager.get_connection(request.connection_name)

        if connection is None:
            return ExecuteSqlResponse(
                success=False,
                rows_affected=0,
                data=[],
                error=f"Connection '{request.connection_name}' not found. Available connections: {connection_manager.list_connections()}",
            )

        # Execute the SQL statement
        result = connection.execute_sql(request.sql_statement)

        # Return the result
        return ExecuteSqlResponse(
            success=result.success,
            rows_affected=result.rows_affected,
            data=result.data,
            error=result.error,
        )

    except Exception as e:
        logger.error(f"Failed to execute SQL: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# --- Helper Functions ---


async def _perform_initialization(request: InitializeRequest):
    """Perform initialization including file templates, secrets, connections, and streamlit startup."""

    # Handle secrets initialization if present
    if request.secrets:
        for secret in request.secrets:
            store_secret(secret)

    # Initialize connections from /etc/secrets/connections/
    connection_manager.initialize_connections()
    logger.info(f"Initialized connections: {connection_manager.list_connections()}")

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
