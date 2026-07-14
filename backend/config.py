import os
import platform

IS_WINDOWS = platform.system() == "Windows"
DEFAULT_SHELL = "powershell.exe" if IS_WINDOWS else "/bin/bash"

IGNORED_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv", "env", ".idea", ".vscode", "dist", "build", "target", ".next", ".cache", ".pytest_cache", ".mypy_cache", ".ruff_cache"}

IGNORED_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}

BINARY_EXTENSIONS = {
    ".pyc", ".pyo", ".class", ".o", ".obj", ".exe", ".dll", ".so", ".dylib",
    ".zip", ".tar", ".gz", ".rar", ".7z", ".jpg", ".jpeg", ".png", ".gif",
    ".bmp", ".ico", ".svg", ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".flv",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}

MAX_FILE_SIZE = 1024 * 1024  # 1 MB

LANGUAGE_RUNNERS = {
    "python": {
        "ext": [".py"],
        "command": "python",
    },
    "java": {
        "ext": [".java"],
        "compile": "javac",
        "run": "java",
        "run_flag": "",
    },
    "javascript": {
        "ext": [".js", ".mjs", ".cjs"],
        "command": "node",
    },
    "typescript": {
        "ext": [".ts"],
        "command": "tsx",
    },
    "c": {
        "ext": [".c"],
        "compile": "gcc",
        "run_flag": "-o",
    },
    "cpp": {
        "ext": [".cpp", ".cc", ".cxx"],
        "compile": "g++",
        "run_flag": "-o",
    },
    "go": {
        "ext": [".go"],
        "command": "go run",
    },
    "rust": {
        "ext": [".rs"],
        "compile": "rustc",
        "run_flag": "-o",
    },
    "ruby": {
        "ext": [".rb"],
        "command": "ruby",
    },
    "php": {
        "ext": [".php"],
        "command": "php",
    },
    "lua": {
        "ext": [".lua"],
        "command": "lua",
    },
    "perl": {
        "ext": [".pl"],
        "command": "perl",
    },
    "r": {
        "ext": [".r"],
        "command": "Rscript",
    },
    "kotlin": {
        "ext": [".kt", ".kts"],
        "command": "kotlinc -script",
    },
    "dart": {
        "ext": [".dart"],
        "command": "dart",
    },
    "swift": {
        "ext": [".swift"],
        "command": "swift",
    },
    "scala": {
        "ext": [".scala"],
        "command": "scala",
    },
    "groovy": {
        "ext": [".groovy"],
        "command": "groovy",
    },
    "julia": {
        "ext": [".jl"],
        "command": "julia",
    },
    "haskell": {
        "ext": [".hs"],
        "command": "runhaskell",
    },
    "shell": {
        "ext": [".sh", ".bash", ".zsh"],
        "command": "bash",
    },
    "powershell": {
        "ext": [".ps1"],
        "command": "pwsh",
    },
}