import os
import re
import shlex
import shutil
import subprocess
import logging
import time
import threading
from pathlib import Path
from typing import Optional

from config import (
    IGNORED_DIRS, IGNORED_FILES, BINARY_EXTENSIONS,
    MAX_FILE_SIZE, LANGUAGE_RUNNERS, DEFAULT_SHELL, IS_WINDOWS,
)
from models import (
    FileNode, FileContent, SearchResult, RunResult,
    TerminalResult, Problem, PortInfo,
)

logger = logging.getLogger(__name__)


def get_language_from_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    lang_map = {
        ".py": "python", ".js": "javascript", ".jsx": "javascript",
        ".ts": "typescript", ".tsx": "typescript", ".java": "java",
        ".c": "c", ".cpp": "cpp", ".cc": "cpp", ".cxx": "cpp",
        ".cs": "csharp", ".go": "go", ".rs": "rust", ".rb": "ruby",
        ".php": "php", ".swift": "swift", ".kt": "kotlin", ".kts": "kotlin",
        ".dart": "dart", ".lua": "lua", ".pl": "perl", ".r": "r",
        ".scala": "scala", ".groovy": "groovy", ".jl": "julia",
        ".hs": "haskell", ".m": "objective-c", ".sql": "sql",
        ".sh": "shell", ".bash": "shell", ".zsh": "shell",
        ".ps1": "powershell", ".html": "html", ".htm": "html",
        ".css": "css", ".scss": "scss", ".less": "less",
        ".json": "json", ".xml": "xml", ".yaml": "yaml", ".yml": "yaml",
        ".toml": "toml", ".md": "markdown", ".vue": "html",
        ".svelte": "html", ".txt": "plaintext", ".csv": "plaintext",
        ".dockerfile": "dockerfile", ".env": "plaintext",
        ".gitignore": "ignore", ".editorconfig": "ini",
    }
    return lang_map.get(ext, "plaintext")


def is_binary_file(filepath: str) -> bool:
    return Path(filepath).suffix.lower() in BINARY_EXTENSIONS


def validate_path(path: str) -> Path:
    resolved = Path(path).resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Path does not exist: {path}")
    return resolved


def quote_path(path_str: str) -> str:
    if IS_WINDOWS:
        return f'"{path_str}"'
    return shlex.quote(path_str)


def list_directory(dir_path: str) -> list[FileNode]:
    path = Path(dir_path)
    if not path.is_dir():
        raise NotADirectoryError(f"Not a directory: {dir_path}")

    nodes = []
    try:
        entries = sorted(path.iterdir(), key=lambda e: (not _safe_is_dir(e), e.name.lower()))
    except PermissionError:
        logger.warning(f"Permission denied: {dir_path}")
        return nodes

    for entry in entries:
        if entry.name in IGNORED_DIRS or entry.name in IGNORED_FILES:
            continue
        if entry.name.startswith(".") and entry.name not in {".env", ".gitignore", ".editorconfig", ".env.local", ".env.production", ".env.development"}:
            continue
        if entry.suffix.lower() in {".class", ".o", ".obj", ".pyc", ".pyo"}:
            continue

        try:
            if entry.is_dir():
                nodes.append(FileNode(
                    name=entry.name,
                    path=str(entry),
                    type="directory",
                    children=None,
                ))
            elif entry.is_file():
                nodes.append(FileNode(
                    name=entry.name,
                    path=str(entry),
                    type="file",
                ))
        except (PermissionError, OSError):
            continue

    return nodes


def _safe_is_dir(entry):
    try:
        return entry.is_dir()
    except (PermissionError, OSError):
        return False


def list_subdirectories(dir_path: str) -> list[dict]:
    path = Path(dir_path)
    if not path.is_dir():
        raise NotADirectoryError(f"Not a directory: {dir_path}")

    entries = []
    try:
        for entry in sorted(path.iterdir(), key=lambda e: (not _safe_is_dir(e), e.name.lower())):
            if entry.name in IGNORED_DIRS:
                continue
            if entry.name.startswith(".") and entry.name not in {".env", ".gitignore", ".editorconfig"}:
                continue
            try:
                is_dir = entry.is_dir()
            except OSError:
                continue
            entries.append({
                "name": entry.name,
                "path": str(entry),
                "type": "directory" if is_dir else "file",
            })
    except PermissionError:
        logger.warning(f"Permission denied: {dir_path}")
    return entries


def read_file(file_path: str) -> FileContent:
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {file_path}")

    size = path.stat().st_size
    if size > MAX_FILE_SIZE:
        raise ValueError(f"File too large: {size} bytes (max {MAX_FILE_SIZE})")

    if is_binary_file(file_path):
        return FileContent(
            path=str(path),
            content="[Binary file — cannot display]",
            language="plaintext",
            size=size,
        )

    try:
        content = path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise ValueError(f"Cannot read file: {e}")

    return FileContent(
        path=str(path),
        content=content,
        language=get_language_from_extension(path.name),
        size=size,
    )


def write_file(file_path: str, content: str) -> dict:
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if IS_WINDOWS:
        full_path = str(path.resolve())
        if not full_path.startswith("\\\\?\\"):
            path = Path("\\\\?\\" + full_path)

    path.write_text(content, encoding="utf-8")
    logger.info(f"File written: {file_path}")
    return {"status": "ok", "path": str(path)}


def create_directory(dir_path: str) -> dict:
    path = Path(dir_path)
    path.mkdir(parents=True, exist_ok=True)
    logger.info(f"Directory created: {dir_path}")
    return {"status": "ok", "path": str(path)}


def delete_path(target_path: str) -> dict:
    path = Path(target_path)
    if not path.exists():
        raise FileNotFoundError(f"Path not found: {target_path}")

    if path.is_dir():
        shutil.rmtree(str(path))
    else:
        path.unlink()

    logger.info(f"Deleted: {target_path}")
    return {"status": "ok"}


def rename_path(old_path: str, new_name: str) -> dict:
    path = Path(old_path)
    if not path.exists():
        raise FileNotFoundError(f"Path not found: {old_path}")

    new_path = path.parent / new_name
    if new_path.exists():
        raise FileExistsError(f"Already exists: {new_path}")

    old_stem = path.stem
    for ext in (".class", ".o", ".obj", ".pyc", ".pyo"):
        stale = path.parent / (old_stem + ext)
        if stale.exists():
            try:
                stale.unlink()
                logger.info(f"Cleaned up stale artifact: {stale}")
            except Exception:
                pass

    path.rename(new_path)
    logger.info(f"Renamed: {old_path} -> {new_path}")
    return {"status": "ok", "new_path": str(new_path)}


def copy_path(source: str, dest: str) -> dict:
    src = Path(source)
    if not src.exists():
        raise FileNotFoundError(f"Source not found: {source}")

    dst = Path(dest)
    if src.is_dir():
        dest_dir = dst / src.name if dst.is_dir() else dst
        shutil.copytree(str(src), str(dest_dir))
    else:
        dest_file = dst / src.name if dst.is_dir() else dst
        dest_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(str(src), str(dest_file))

    logger.info(f"Copied: {source} -> {dest}")
    return {"status": "ok"}


def move_path(source: str, dest: str) -> dict:
    src = Path(source)
    if not src.exists():
        raise FileNotFoundError(f"Source not found: {source}")

    dst = Path(dest)
    dest_path = dst / src.name if dst.is_dir() else dst
    shutil.move(str(src), str(dest_path))
    logger.info(f"Moved: {source} -> {dest_path}")
    return {"status": "ok", "new_path": str(dest_path)}


def search_in_files(workspace_path: str, query: str) -> list[SearchResult]:
    results = []
    path = Path(workspace_path)

    for file_path in path.rglob("*"):
        if not file_path.is_file():
            continue
        if any(part in IGNORED_DIRS for part in file_path.parts):
            continue
        if is_binary_file(str(file_path)):
            continue
        if file_path.stat().st_size > MAX_FILE_SIZE:
            continue

        try:
            lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
            for i, line in enumerate(lines, 1):
                if query.lower() in line.lower():
                    results.append(SearchResult(
                        file=str(file_path),
                        line=i,
                        content=line.strip()[:200],
                    ))
                    if len(results) >= 100:
                        return results
        except Exception:
            continue

    return results


def parse_problems(stderr: str, file_path: str) -> list[Problem]:
    problems = []
    if not stderr.strip():
        return problems

    patterns = [
        re.compile(r"(?P<file>[^:]+):(?P<line>\d+):(?P<col>\d+):\s*(?P<sev>error|warning|note):\s*(?P<msg>.+)"),
        re.compile(r"File\s+\"(?P<file>[^\"]+)\",\s+line\s+(?P<line>\d+)"),
        re.compile(r"(?P<file>[^:]+):(?P<line>\d+):\s*(?P<msg>.+)"),
    ]

    for line in stderr.strip().splitlines():
        matched = False
        for pattern in patterns:
            m = pattern.search(line)
            if m:
                groups = m.groupdict()
                problems.append(Problem(
                    severity=groups.get("sev", "error"),
                    message=groups.get("msg", line.strip()),
                    file=groups.get("file", file_path),
                    line=int(groups["line"]) if "line" in groups else None,
                    column=int(groups["col"]) if "col" in groups else None,
                ))
                matched = True
                break
        if not matched and line.strip():
            problems.append(Problem(
                severity="error",
                message=line.strip(),
                file=file_path,
            ))

    return problems


def detect_runner(file_path: str) -> Optional[dict]:
    ext = Path(file_path).suffix.lower()
    for lang, config in LANGUAGE_RUNNERS.items():
        if ext in config.get("ext", []):
            return {**config, "lang": lang}
    return None


def is_vite_project(workspace_path: str) -> bool:
    pkg_json = Path(workspace_path) / "package.json"
    if pkg_json.exists():
        try:
            import json
            data = json.loads(pkg_json.read_text())
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            return "vite" in deps
        except Exception:
            pass
    return False


def run_file(file_path: str, workspace_path: Optional[str] = None) -> RunResult:
    path = Path(file_path)
    if not path.is_file():
        return RunResult(stderr=f"File not found: {file_path}", exit_code=1)

    cwd = workspace_path or str(path.parent)
    ext = path.suffix.lower()

    if ext in (".html", ".htm"):
        return RunResult(
            stdout=f"Open in browser: {path.resolve().as_uri()}",
            exit_code=0,
        )

    if ext in (".css", ".scss", ".less"):
        return RunResult(
            stdout=f"{path.name} is a stylesheet — no execution needed.",
            exit_code=0,
        )

    if ext == ".json":
        try:
            import json
            data = json.loads(path.read_text(encoding="utf-8"))
            return RunResult(stdout=f"Valid JSON: {path.name}\n{json.dumps(data, indent=2)[:2000]}", exit_code=0)
        except Exception as e:
            return RunResult(stderr=f"Invalid JSON: {e}", exit_code=1)

    if ext in (".md", ".txt"):
        return RunResult(stdout=f"{path.name} is a text file — no execution needed.", exit_code=0)

    if ext in (".jsx", ".tsx") and workspace_path and is_vite_project(workspace_path):
        return _run_vite_project(workspace_path)

    if ext == ".json" and path.name == "package.json":
        return _run_npm_command("start", workspace_path or str(path.parent))

    runner = detect_runner(file_path)
    if not runner:
        return RunResult(stderr=f"No runner configured for {ext} files", exit_code=1)

    if "compile" in runner:
        return _run_compiled(path, runner, cwd)

    command = runner["command"]
    quoted_path = quote_path(str(path))
    cmd = f"{command} {quoted_path}"

    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            timeout=30, cwd=cwd,
        )
        problems = parse_problems(result.stderr, file_path)
        return RunResult(
            stdout=result.stdout,
            stderr=result.stderr,
            exit_code=result.returncode,
            problems=[p.model_dump() for p in problems],
        )
    except subprocess.TimeoutExpired:
        return RunResult(stderr="Execution timed out (30s limit)", exit_code=124)
    except FileNotFoundError:
        return RunResult(
            stderr=f"Runtime not found: {command}. Please install it and ensure it's in your PATH.",
            exit_code=127,
        )


def _run_compiled(path: Path, runner: dict, cwd: str) -> RunResult:
    compiler = runner["compile"]
    output_name = path.stem + (".exe" if IS_WINDOWS else "")
    output_path = path.parent / output_name

    for ext in (".class", ".o", ".obj"):
        stale = path.parent / (path.stem + ext)
        if stale.exists():
            try:
                stale.unlink()
                logger.info(f"Pre-compile cleanup: {stale}")
            except Exception:
                pass

    quoted_path = quote_path(str(path))
    quoted_output = quote_path(str(output_path))

    if runner.get("lang") == "java":
        compile_cmd = f"{compiler} {quoted_path}"
    else:
        compile_cmd = f"{compiler} {quoted_path} {runner.get('run_flag', '-o')} {quoted_output}"

    try:
        compile_result = subprocess.run(
            compile_cmd, shell=True, capture_output=True, text=True,
            timeout=30, cwd=cwd,
        )
        if compile_result.returncode != 0:
            problems = parse_problems(compile_result.stderr, str(path))
            return RunResult(
                stderr=compile_result.stderr,
                exit_code=compile_result.returncode,
                problems=[p.model_dump() for p in problems],
            )
    except subprocess.TimeoutExpired:
        return RunResult(stderr="Compilation timed out", exit_code=124)
    except FileNotFoundError:
        return RunResult(stderr=f"Compiler not found: {compiler}", exit_code=127)

    if runner.get("lang") == "java":
        run_cmd = f"{runner.get('run', 'java')} {quote_path(path.stem)}"
    else:
        run_cmd = quote_path(str(output_path))

    try:
        run_result = subprocess.run(
            run_cmd, shell=True, capture_output=True, text=True,
            timeout=30, cwd=cwd,
        )
        problems = parse_problems(run_result.stderr, str(path))
        return RunResult(
            stdout=run_result.stdout,
            stderr=run_result.stderr,
            exit_code=run_result.returncode,
            problems=[p.model_dump() for p in problems],
        )
    except subprocess.TimeoutExpired:
        return RunResult(stderr="Execution timed out", exit_code=124)
    finally:
        for ext in (".class", ".o", ".obj", ".exe"):
            artifact = path.parent / (path.stem + ext)
            if artifact.exists():
                try:
                    artifact.unlink()
                    logger.info(f"Post-run cleanup: {artifact}")
                except Exception:
                    pass


def _run_vite_project(workspace_path: str) -> RunResult:
    node_modules = Path(workspace_path) / "node_modules"
    if not node_modules.exists():
        try:
            install = subprocess.run(
                "npm install", shell=True, capture_output=True, text=True,
                timeout=120, cwd=workspace_path,
            )
            if install.returncode != 0:
                return RunResult(stderr=f"npm install failed:\n{install.stderr}", exit_code=install.returncode)
        except subprocess.TimeoutExpired:
            return RunResult(stderr="npm install timed out", exit_code=124)

    try:
        process = subprocess.Popen(
            "npm run dev", shell=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, cwd=workspace_path,
            bufsize=1,
        )

        
        stdout_lines = []

        def reader():
            for line in process.stdout:
                stdout_lines.append(line)
                if len(stdout_lines) > 50:
                    break

        t = threading.Thread(target=reader, daemon=True)
        t.start()
        t.join(timeout=6)  

        output = "".join(stdout_lines)
        port = 5173
        port_match = re.search(r"localhost:(\d+)", output)
        if port_match:
            port = int(port_match.group(1))

        return RunResult(
            stdout=f"Vite dev server running at http://localhost:{port}\n{output}",
            exit_code=0,
            port=port,
            url=f"http://localhost:{port}",
            process_name="vite",
        )
    except Exception as e:
        return RunResult(stderr=f"Failed to start Vite: {str(e)}", exit_code=1)


def _run_npm_command(script: str, workspace_path: str) -> RunResult:
    try:
        result = subprocess.run(
            f"npm run {script}", shell=True, capture_output=True, text=True,
            timeout=30, cwd=workspace_path,
        )
        return RunResult(
            stdout=result.stdout,
            stderr=result.stderr,
            exit_code=result.returncode,
        )
    except subprocess.TimeoutExpired:
        return RunResult(stderr=f"npm run {script} timed out", exit_code=124)


def execute_terminal_command(command: str, cwd: Optional[str] = None) -> TerminalResult:
    work_dir = cwd or os.path.expanduser("~")
    if not os.path.isdir(work_dir):
        work_dir = os.path.expanduser("~")

    stripped = command.strip()

   
    if stripped.startswith("cd "):
        target = stripped[3:].strip().strip('"').strip("'")
        if target == "~":
            new_dir = os.path.expanduser("~")
        elif os.path.isabs(target):
            new_dir = target
        else:
            new_dir = os.path.join(work_dir, target)

        new_dir = os.path.normpath(new_dir)
        if os.path.isdir(new_dir):
            return TerminalResult(cwd=new_dir)
        else:
            return TerminalResult(
                stderr=f"cd: no such directory: {target}",
                exit_code=1,
                cwd=work_dir,
            )

    if stripped == "cd":
        return TerminalResult(cwd=os.path.expanduser("~"))

    if stripped in ("clear", "cls"):
        return TerminalResult(cwd=work_dir, stdout="", exit_code=0)

    if stripped == "pwd":
        return TerminalResult(stdout=work_dir + "\n", exit_code=0, cwd=work_dir)

    try:
        process = subprocess.Popen(
            command, shell=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, cwd=work_dir,
            env={**os.environ, "PYTHONUNBUFFERED": "1", "FORCE_COLOR": "1"},
            bufsize=1,
        )

        output_lines = []

        def reader():
            for line in process.stdout:
                output_lines.append(line)

        t = threading.Thread(target=reader, daemon=True)
        t.start()

        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            
            t.join(timeout=0.5)
            process.kill()
            process.wait()
            output_lines.append("[Command timed out]\n")
        
        output = "".join(output_lines)
        return TerminalResult(
            stdout=output or "",
            stderr="",
            exit_code=process.returncode,
            cwd=work_dir,
        )
    except Exception as e:
        return TerminalResult(stderr=str(e), exit_code=1, cwd=work_dir)


def get_active_ports() -> list[PortInfo]:
    ports = []
    try:
        if IS_WINDOWS:
            result = subprocess.run(
                'netstat -ano | findstr "LISTENING"',
                shell=True, capture_output=True, text=True, timeout=5,
            )
        else:
            result = subprocess.run(
                "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null",
                shell=True, capture_output=True, text=True, timeout=5,
            )

        common_dev_ports = {3000, 3001, 4200, 5173, 5174, 5000, 8000, 8080, 8888, 9000}

        for line in result.stdout.splitlines():
            for port in common_dev_ports:
                if f":{port}" in line:
                    process_name = "unknown"
                    pid_match = re.search(r"pid=(\d+)", line) or re.search(r"\s(\d+)\s*$", line)
                    if pid_match:
                        try:
                            pid = pid_match.group(1)
                            if IS_WINDOWS:
                                ps = subprocess.run(
                                    f'tasklist /FI "PID eq {pid}" /FO CSV /NH',
                                    shell=True, capture_output=True, text=True, timeout=3,
                                )
                                if ps.stdout.strip():
                                    process_name = ps.stdout.strip().split(",")[0].strip('"')
                            else:
                                ps = subprocess.run(
                                    f"ps -p {pid} -o comm=",
                                    shell=True, capture_output=True, text=True, timeout=3,
                                )
                                if ps.stdout.strip():
                                    process_name = ps.stdout.strip()
                        except Exception:
                            pass

                    ports.append(PortInfo(
                        port=port,
                        process=process_name,
                        url=f"http://localhost:{port}",
                    ))

    except Exception as e:
        logger.warning(f"Failed to detect ports: {e}")

    seen = set()
    unique = []
    for p in ports:
        if p.port not in seen:
            seen.add(p.port)
            unique.append(p)

    return unique