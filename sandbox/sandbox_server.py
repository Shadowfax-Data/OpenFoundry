# main.py
import logging
import os
import subprocess
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, status
from find_api import router as find_api_router
from openhands_aci.editor import OHEditor
from openhands_aci.editor.results import CLIResult
from pcb_api import router as pcb_api_router
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

app.include_router(pcb_api_router)
app.include_router(find_api_router)

# --- Pydantic Models ---


class StrReplaceEditorRequest(BaseModel):
    command: Literal['view', 'create', 'str_replace', 'insert', 'undo_edit']
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


editor = OHEditor(workspace_root='/workspace')


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
    cwd: str = '/workspace'
    timeout_seconds: int = 300


class RunShellResponse(BaseModel):
    stdout: str
    stderr: str
    timeout: bool = False
    return_code: int | None = None


# --- API Endpoints ---


@app.get('/health')
def health():
    return {'message': 'Action execution server is running.'}


# Editor Endpoint
@app.post('/str_replace_editor', response_model=StrReplaceEditorResponse)
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
        logger.error(f'Error executing editor command: {e}', exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# File Operation Endpoints
@app.post('/write_file')
def write_file(req: WriteFileRequest):
    """
    Write the file at the given path with the provided content.
    """
    logger.info(
        f"Received write_file request: file_path='{req.file_path}', content_length={len(req.content)}"
    )
    if not os.path.isabs(req.file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail='File path must be absolute'
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
                detail=f'Failed to create parent directories: {e}',
            )

    try:
        with open(req.file_path, 'w', encoding='utf-8') as f:
            f.write(req.content)
        logger.info(f"Successfully wrote file: {req.file_path}")
        return {'message': f'File written successfully to {req.file_path}'}
    except Exception as e:
        logger.error(f"Failed to write file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to write file: {e}',
        )


@app.get('/read_file')
def read_file(file_path: str = Query(..., description='Absolute file path')):
    """
    Read the content of a file.
    """
    logger.info(f"Received read_file request: file_path='{file_path}'")
    if not os.path.isabs(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail='File path must be absolute'
        )
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='File not found'
        )
    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail='Path is not a file'
        )

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        logger.info(f"Successfully read file: {file_path}")
        return {'file_path': file_path, 'content': content}
    except Exception as e:
        logger.error(f"Failed to read file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to read file: {e}',
        )


@app.get('/list_files')
def list_files(
    directory_path: str = Query(
        '/workspace', description='Directory path to list files from'
    ),
):
    """
    List files and directories in the specified directory.
    """
    logger.info(f"Received list_files request: directory_path='{directory_path}'")
    if not os.path.isabs(directory_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Directory path must be absolute',
        )
    if not os.path.exists(directory_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail='Directory not found'
        )
    if not os.path.isdir(directory_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail='Path is not a directory'
        )

    try:
        items = os.listdir(directory_path)
        files = []
        directories = []

        for item in items:
            item_path = os.path.join(directory_path, item)
            if os.path.isfile(item_path):
                files.append(item)
            elif os.path.isdir(item_path):
                directories.append(item)

        logger.info(
            f"Successfully listed directory: {directory_path} ({len(files)} files, {len(directories)} directories)"
        )
        return ListFilesResponse(files=files, directories=directories)
    except Exception as e:
        logger.error(f"Failed to list directory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to list directory: {e}',
        )


@app.post('/run_shell', response_model=RunShellResponse)
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
            detail='Working directory must be absolute',
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
            stdout=e.stdout or '',
            stderr=e.stderr or '',
            timeout=True,
            return_code=None,
        )
    except Exception as e:
        logger.error(f"Failed to execute shell command: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to execute command: {e}',
        )
