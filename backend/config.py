import os
import platform

SYSTEM = platform.system()
IS_WINDOWS = SYSTEM == "Windows"

DEFAULT_SHELL = "powershell.exe" if IS_WINDOWS else "/bin/bash"

IGNORED_DIRS = {
    "__pycache__", "node_modules", ".git", ".vscode", ".idea",
    "venv", "env", ".venv", "dist", "build", ".next",
    ".cache", ".parcel-cache", "coverage", ".mypy_cache",
    ".pytest_cache", ".tox", "egg-info", ".sass-cache",
    "*.egg-info",
}

IGNORED_FILES = {".DS_Store", "Thumbs.db", ".gitkeep"}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
    ".mp3", ".mp4", ".wav", ".avi", ".mov", ".mkv", ".webm",
    ".zip", ".tar", ".gz", ".rar", ".7z", ".tgz",
    ".exe", ".dll", ".so", ".dylib", ".bin",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".pyc", ".pyo", ".class", ".o", ".obj", ".wasm",
    ".woff", ".woff2", ".ttf", ".eot", ".otf",
    ".sqlite", ".db", ".mdb",
}

LANGUAGE_RUNNERS = {
    "python": {"command": "python3" if not IS_WINDOWS else "python", "ext": [".py"]},
    "javascript": {"command": "node", "ext": [".js", ".mjs", ".cjs"]},
    "typescript": {"command": "npx tsx", "ext": [".ts"]},
    "java": {"compile": "javac", "run": "java", "ext": [".java"]},
    "c": {"compile": "gcc", "run_flag": "-o", "ext": [".c"]},
    "cpp": {"compile": "g++", "run_flag": "-o", "ext": [".cpp", ".cc", ".cxx"]},
    "csharp": {"command": "dotnet script", "ext": [".cs"]},
    "go": {"command": "go run", "ext": [".go"]},
    "rust": {"command": "rustc", "ext": [".rs"]},
    "ruby": {"command": "ruby", "ext": [".rb"]},
    "php": {"command": "php", "ext": [".php"]},
    "kotlin": {"command": "kotlinc -script", "ext": [".kt", ".kts"]},
    "swift": {"command": "swift", "ext": [".swift"]},
    "dart": {"command": "dart run", "ext": [".dart"]},
    "lua": {"command": "lua", "ext": [".lua"]},
    "perl": {"command": "perl", "ext": [".pl"]},
    "r": {"command": "Rscript", "ext": [".r", ".R"]},
    "scala": {"command": "scala", "ext": [".scala"]},
    "groovy": {"command": "groovy", "ext": [".groovy"]},
    "julia": {"command": "julia", "ext": [".jl"]},
    "haskell": {"command": "runhaskell", "ext": [".hs"]},
    "shell": {"command": DEFAULT_SHELL if not IS_WINDOWS else "powershell -Command", "ext": [".sh", ".bash", ".zsh"]},
    "powershell": {"command": "powershell -File", "ext": [".ps1"]},
}