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