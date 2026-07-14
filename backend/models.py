from pydantic import BaseModel
from typing import Optional, List


class WorkspaceOpenRequest(BaseModel):
    path: str


class WorkspaceInfo(BaseModel):
    path: str
    name: str
    exists: bool


class FileCreateRequest(BaseModel):
    path: str
    content: str


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


class RunRequest(BaseModel):
    file_path: str
    workspace_path: Optional[str] = None
    content: Optional[str] = None


class TerminalRequest(BaseModel):
    command: str
    cwd: Optional[str] = None


class FileNode(BaseModel):
    name: str
    path: str
    type: str
    children: Optional[List["FileNode"]] = None


class FileContent(BaseModel):
    path: str
    content: str
    language: str
    size: int


class SearchResult(BaseModel):
    file: str
    line: int
    content: str


class RunResult(BaseModel):
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: int = 0
    problems: Optional[List[dict]] = None
    port: Optional[int] = None
    url: Optional[str] = None
    process_name: Optional[str] = None
    preview: Optional[str] = None
    preview_type: Optional[str] = None


class TerminalResult(BaseModel):
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    exit_code: int = 0
    cwd: Optional[str] = None


class Problem(BaseModel):
    severity: str
    message: str
    file: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None


class PortInfo(BaseModel):
    port: int
    url: Optional[str] = None
    process: Optional[str] = None


class DirectoryContents(BaseModel):
    path: str
    entries: List[FileNode]


FileNode.model_rebuild()