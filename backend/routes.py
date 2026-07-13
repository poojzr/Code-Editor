import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

from models import (
    WorkspaceOpenRequest, WorkspaceInfo, FileCreateRequest,
    FolderCreateRequest, FileRenameRequest, FileCopyRequest,
    FileMoveRequest, SearchRequest, RunRequest, TerminalRequest,
)
import services

logger = logging.getLogger(__name__)

router = APIRouter()

_current_workspace: dict | None = None

@router.get("/health")
async def health():
    import os
    return {"status": "ok", "service": "code-editor", "home": os.path.expanduser("~")}

@router.post("/workspace/open")
async def open_workspace(req: WorkspaceOpenRequest):
    global _current_workspace
    path = Path(req.path).resolve()
    if not path.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory not found: {req.path}")

    _current_workspace = {"path": str(path), "name": path.name}
    logger.info(f"Workspace opened: {path}")
    return WorkspaceInfo(path=str(path), name=path.name, exists=True)

@router.get("/workspace/info")
async def workspace_info():
    if not _current_workspace:
        raise HTTPException(status_code=400, detail="No workspace open")
    return WorkspaceInfo(**_current_workspace, exists=True)

@router.get("/workspace/files")
async def get_files(path: str = Query(...)):
    try:
        return services.list_directory(path)
    except (FileNotFoundError, NotADirectoryError) as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/workspace/file")
async def get_file(path: str = Query(...)):
    try:
        return services.read_file(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/workspace/file/create")
async def create_file(req: FileCreateRequest):
    try:
        return services.write_file(req.path, req.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workspace/folder/create")
async def create_folder(req: FolderCreateRequest):
    try:
        return services.create_directory(req.path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/workspace/file/delete")
async def delete_file(path: str = Query(...)):
    try:
        return services.delete_path(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/workspace/file/rename")
async def rename_file(req: FileRenameRequest):
    try:
        return services.rename_path(req.old_path, req.new_name)
    except (FileNotFoundError, FileExistsError) as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/workspace/file/copy")
async def copy_file(req: FileCopyRequest):
    try:
        return services.copy_path(req.source_path, req.dest_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/workspace/file/move")
async def move_file(req: FileMoveRequest):
    try:
        return services.move_path(req.source_path, req.dest_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/workspace/search")
async def search_files(req: SearchRequest):
    try:
        return services.search_in_files(req.path, req.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workspace/run")
async def run_file(req: RunRequest):
    result = services.run_file(req.file_path, req.workspace_path, req.content)
    return result

@router.post("/workspace/terminal")
async def terminal(req: TerminalRequest):
    result = services.execute_terminal_command(req.command, req.cwd)
    return result

@router.get("/workspace/problems")
async def get_problems():
    return []

@router.get("/workspace/browse")
async def browse_directory(path: str = Query(default=None)):
    return {"path": "", "entries": []}

@router.get("/workspace/ports")
async def get_ports():
    try:
        return services.get_active_ports()
    except Exception as e:
        logger.error(f"Port detection failed: {e}")
        return []