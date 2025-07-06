import fnmatch
import logging
import os
import re
import subprocess
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/find", tags=["find"])
logger = logging.getLogger(__name__)

WORKSPACE_DIR = "/workspace"


def get_ignored_paths(root: str) -> set[str]:
    """Return a set of absolute paths for files/directories that are ignored by git."""
    try:
        out = subprocess.check_output(
            ["git", "ls-files", "--others", "--ignored", "--exclude-standard"],
            cwd=root,
            text=True,
        )
        return {os.path.abspath(os.path.join(root, p)) for p in out.splitlines()}
    except subprocess.CalledProcessError:
        return set()


def is_skippable(path: str, ignored: set[str]) -> bool:
    return os.path.basename(path) == ".git" or path in ignored


class FindFileContentsRequest(BaseModel):
    search_path: str
    regex: str
    flags: int = re.MULTILINE | re.IGNORECASE | re.DOTALL
    error_policy: Literal["strict", "ignore", "replace"] = "ignore"
    limit: int = 100


class FindFileContentsMatch(BaseModel):
    file_path: str
    line_number: int
    matched_text: str
    context: str


class FindFileContentsResponse(BaseModel):
    matches: list[FindFileContentsMatch]
    limit_exceeded: bool = False


@router.post("/file_contents", response_model=FindFileContentsResponse)
def find_file_contents(req: FindFileContentsRequest):
    """Search for regex matches in files or directories."""
    logger.info(
        f"Received find_file_contents request: search_path='{req.search_path}', regex='{req.regex}'"
    )

    # Validate absolute path
    if not os.path.isabs(req.search_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Path must be absolute"
        )
    if not os.path.exists(req.search_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File or directory not found"
        )

    # Compile regex
    try:
        pattern = re.compile(req.regex, req.flags)
    except re.error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid regex pattern: {e}",
        )

    ignored = get_ignored_paths(WORKSPACE_DIR)
    matches: list[FindFileContentsMatch] = []

    def search_file(path: str):
        try:
            with open(path, "r", encoding="utf-8", errors=req.error_policy) as f:
                content = f.read()
                lines = content.splitlines(keepends=True)
        except Exception as e:
            logger.warning(f"Skipping unreadable file {path}: {e}")
            return

        for m in pattern.finditer(content):
            start = m.start()
            line_no = content[:start].count("\n") + 1
            text = m.group(0).strip()

            # Context: 2 lines before and after
            start_line = max(0, line_no - 3)
            end_line = min(len(lines), line_no + 2)
            ctx = [f"{i+1}: {lines[i].rstrip()}" for i in range(start_line, end_line)]

            matches.append(
                FindFileContentsMatch(
                    file_path=path,
                    line_number=line_no,
                    matched_text=text,
                    context="\n".join(ctx),
                )
            )

    limit_exceeded = False
    # Single-file case
    if os.path.isfile(req.search_path):
        if not is_skippable(req.search_path, ignored):
            search_file(req.search_path)
            if len(matches) >= req.limit:
                limit_exceeded = True
    else:
        for root, dirs, files in os.walk(req.search_path):
            # prune skipped directories
            dirs[:] = [
                d for d in dirs if not is_skippable(os.path.join(root, d), ignored)
            ]
            for fname in files:
                full = os.path.join(root, fname)
                if not is_skippable(full, ignored):
                    search_file(full)
                    if len(matches) >= req.limit:
                        limit_exceeded = True
                        break
            if limit_exceeded:
                break

    return FindFileContentsResponse(matches=matches, limit_exceeded=limit_exceeded)


class FindFileNamesRequest(BaseModel):
    search_path: str
    glob: str
    limit: int = 100


class FindFileNamesResponse(BaseModel):
    matches: list[str]
    limit_exceeded: bool = False


@router.post("/file_names", response_model=FindFileNamesResponse)
def find_file_names(req: FindFileNamesRequest):
    """Search for files matching glob patterns in directories."""
    logger.info(
        f"Received find_file_names request: search_path='{req.search_path}', glob='{req.glob}'"
    )

    # Validate absolute path
    if not os.path.isabs(req.search_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Path must be absolute"
        )
    if not os.path.exists(req.search_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Directory not found"
        )
    if not os.path.isdir(req.search_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Path must be a directory"
        )

    # Parse glob patterns (separated by "; ")
    glob_patterns = [
        pattern.strip() for pattern in req.glob.split(";") if pattern.strip()
    ]
    if not glob_patterns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one glob pattern must be provided",
        )

    ignored = get_ignored_paths(WORKSPACE_DIR)
    matches: list[str] = []
    limit_exceeded = False

    # Walk through directory tree
    for root, dirs, files in os.walk(req.search_path):
        # Prune skipped directories
        dirs[:] = [d for d in dirs if not is_skippable(os.path.join(root, d), ignored)]

        for fname in files:
            full_path = os.path.join(root, fname)
            if not is_skippable(full_path, ignored):
                # Check if filename matches any of the glob patterns
                for pattern in glob_patterns:
                    if fnmatch.fnmatch(fname, pattern):
                        matches.append(full_path)
                        break

                if len(matches) >= req.limit:
                    limit_exceeded = True
                    break

        if limit_exceeded:
            break

    return FindFileNamesResponse(matches=matches, limit_exceeded=limit_exceeded)
