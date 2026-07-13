from typing import Optional
from pydantic import BaseModel, Field

class WorkspaceOpenRequest(BaseModel):
    path: str = Field(..., description="Absolute path to workspace folder")

class WorkspaceInfo(BaseModel):
    path: str
    name: str
    exists: bool

class FileNode(BaseModel):
    name: str
    path: str
    type: str  
    children: Optional[list["FileNode"]] = None

class FileContent(BaseModel):
    path: str
    content: str
    language: str
    size: int


class FileCreateRequest(BaseModel):
    path: str
    content: str = ""


class FolderCreateRequest(BaseModel):
    path: str


class FileRenameRequest(BaseModel):
    old_path: str
    new_name: str


class FileCopyRequest(BaseModel):
    source_path: str
    dest_path: str


class FileMoveRequest(BaseModel):
    source_path: str
    dest_path: str


class SearchRequest(BaseModel):
    path: str
    query: str


class SearchResult(BaseModel):
    file: str
    line: int
    content: str


class RunRequest(BaseModel):
    file_path: str
    workspace_path: Optional[str] = None


class RunResult(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    problems: list[dict] = []
    port: Optional[int] = None
    url: Optional[str] = None
    process_name: Optional[str] = None


class TerminalRequest(BaseModel):
    command: str
    cwd: Optional[str] = None


class TerminalResult(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    cwd: str = ""


class Problem(BaseModel):
    severity: str  
    message: str
    file: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None


class PortInfo(BaseModel):
    port: int
    process: str
    url: str