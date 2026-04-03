import re
import tempfile
from pathlib import Path

APP_VERSION = "0.1.0"
if Path("/").anchor == "\\":
    GRAFT_TMP_ROOT = Path(tempfile.gettempdir()) / "graft"
else:
    GRAFT_TMP_ROOT = Path("/tmp/graft")
GRAFT_BUNDLES_ROOT = GRAFT_TMP_ROOT / "bundles"
GRAFT_TMP_ROOT.mkdir(parents=True, exist_ok=True)
GRAFT_BUNDLES_ROOT.mkdir(parents=True, exist_ok=True)

README_CANDIDATES = ["README.md", "README.rst", "README.txt", "readme.md"]
SKIP_DIRS = {".git", "node_modules", "__pycache__", "dist", "build"}
SKIP_FILE_NAMES = {".env"}
BINARY_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".pdf",
    ".zip",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".mp3",
}

EXTENSION_LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".go": "Go",
    ".java": "Java",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++",
    ".c": "C",
    ".h": "C",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
}

TREE_SITTER_LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".java": "java",
}


def should_skip_dir(name: str) -> bool:
    return name in SKIP_DIRS


def should_skip_file(filename: str, relative_path: Path) -> bool:
    return filename in SKIP_FILE_NAMES or relative_path.name.startswith(".env")


def is_binary_file(file_path: Path) -> bool:
    if file_path.suffix.lower() in BINARY_EXTENSIONS:
        return True
    try:
        with file_path.open("rb") as handle:
            chunk = handle.read(2048)
    except OSError:
        return True
    return b"\x00" in chunk


def is_readme_candidate(filename: str) -> bool:
    return filename in README_CANDIDATES


def detect_language(extension: str) -> str:
    return EXTENSION_LANGUAGE_MAP.get(extension.lower(), "Unknown")


def detect_language_from_path(file_path: str) -> str:
    return TREE_SITTER_LANGUAGE_MAP.get(Path(file_path).suffix.lower(), "unknown")


def extract_env_vars(content: str) -> list[str]:
    patterns = [
        re.compile(r"os\.getenv\(['\"]([A-Z0-9_]+)['\"]"),
        re.compile(r"os\.environ\[['\"]([A-Z0-9_]+)['\"]\]"),
        re.compile(r"process\.env\.([A-Z0-9_]+)"),
        re.compile(r"process\.env\[['\"]([A-Z0-9_]+)['\"]\]"),
    ]
    found = set()
    for pattern in patterns:
        found.update(pattern.findall(content))
    return sorted(found)


def extract_third_party_imports(file_path: str, content: str) -> list[str]:
    suffix = Path(file_path).suffix.lower()
    found = set()
    stdlib_modules = {"os", "sys", "json", "re", "typing", "pathlib", "asyncio"}
    for line in content.splitlines():
        stripped = line.strip()
        if suffix == ".py":
            if stripped.startswith("import "):
                module = stripped.replace("import ", "").split(" as ")[0].split(",")[0].strip().split(".")[0]
                if module and module not in stdlib_modules:
                    found.add(module)
            elif stripped.startswith("from "):
                module = stripped.replace("from ", "").split(" import ")[0].strip().split(".")[0]
                if module and module not in stdlib_modules:
                    found.add(module)
        elif suffix in {".js", ".ts", ".jsx", ".tsx"}:
            match = re.search(r"from ['\"]([^'\"]+)['\"]", stripped) or re.search(r"require\(['\"]([^'\"]+)['\"]\)", stripped)
            if match:
                module = match.group(1)
                if not module.startswith("."):
                    found.add(module if module.startswith("@") else module.split("/")[0])
        elif suffix == ".go" and stripped.startswith('"'):
            module = stripped.strip('"')
            if "." in module:
                found.add(module)
        elif suffix == ".java" and stripped.startswith("import "):
            module = stripped.replace("import ", "").replace(";", "").strip()
            if not module.startswith(("java.", "javax.")):
                found.add(module)
    return sorted(found)
