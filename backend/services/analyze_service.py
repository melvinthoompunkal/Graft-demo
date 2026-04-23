import asyncio
import os
import shutil
import tempfile
import json
import logging
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# ── Config ──────────────────────────────────────────────────────────────────────

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
HAIKU_MODEL = "claude-haiku-4-5-20251001"

SKIP_DIRS = {".git", "node_modules", "__pycache__", "dist", "build", ".venv", "venv", ".tox", "env"}
BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".exe", ".dll",
    ".so", ".dylib", ".ico", ".woff", ".woff2", ".ttf", ".eot",
    ".mp4", ".mp3", ".pyc", ".pyo", ".egg-info",
}

EXTENSION_LANGUAGE_MAP = {
    ".py": "Python", ".js": "JavaScript", ".jsx": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript", ".go": "Go",
    ".java": "Java", ".rs": "Rust", ".rb": "Ruby", ".php": "PHP",
    ".cs": "C#", ".cpp": "C++", ".c": "C", ".h": "C",
}

FEATURE_SYSTEM_PROMPT = (
    "You are a senior software engineer analyzing a GitHub repository's README. "
    "Extract a structured list of the distinct features or capabilities this project has. "
    "For each feature, give it: a short slug (snake_case), a human-readable name, and a one-sentence description of what it does. "
    "Return ONLY a JSON array with objects shaped as {slug, name, description}. No preamble, no markdown."
)


# ── Helpers ─────────────────────────────────────────────────────────────────────

def parse_github_url(url: str) -> tuple[str, str]:
    parsed = urlparse(url)
    if parsed.netloc.lower() not in {"github.com", "www.github.com"}:
        raise ValueError("Only GitHub repository URLs are supported.")
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) < 2:
        raise ValueError("URL must include both owner and repo name.")
    owner, repo = parts[0], parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    return owner, repo


def is_binary(path: Path) -> bool:
    if path.suffix.lower() in BINARY_EXTENSIONS:
        return True
    try:
        with path.open("rb") as f:
            return b"\x00" in f.read(2048)
    except OSError:
        return True


def collect_inventory(repo_path: Path) -> tuple[list[dict], str, list[str]]:
    """Walk the repo, collect file metadata, readme, and languages."""
    files = []
    readme = ""
    lang_counts: Counter = Counter()

    # Read README
    for candidate in ("README.md", "README.rst", "README.txt", "readme.md"):
        readme_path = repo_path / candidate
        if readme_path.exists():
            try:
                readme = readme_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                pass
            break

    for root, dirs, filenames in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        root_path = Path(root)

        for filename in filenames:
            file_path = root_path / filename
            relative = file_path.relative_to(repo_path)

            if filename.startswith(".env") or is_binary(file_path):
                continue

            try:
                stat = file_path.stat()
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            ext = file_path.suffix.lower()
            lang = EXTENSION_LANGUAGE_MAP.get(ext)
            if lang:
                lang_counts[lang] += 1

            files.append({
                "path": relative.as_posix(),
                "extension": ext,
                "line_count": len(content.splitlines()),
                "size_bytes": stat.st_size,
            })

    languages = [lang for lang, _ in lang_counts.most_common(5)]
    return files, readme, languages


async def extract_features(readme: str) -> list[dict]:
    """Call Claude Haiku to extract features from the README."""
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set.")

    client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    response = await client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=4096,
        system=FEATURE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"README content:\n{readme[:15000]}"}],
    )

    import re
    text = "".join(
        block.text for block in response.content
        if getattr(block, "type", "") == "text"
    ).strip()

    def clean_json(raw: str) -> str:
        match = re.search(r"```(?:json)?(.*?)```", raw, re.DOTALL)
        return match.group(1).strip() if match else raw.strip()

    try:
        features = json.loads(clean_json(text))
    except json.JSONDecodeError:
        # Retry with stricter instruction
        retry = await client.messages.create(
            model=HAIKU_MODEL,
            max_tokens=4096,
            system=FEATURE_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"README content:\n{readme[:15000]}\n\nIMPORTANT: return ONLY raw JSON, no markdown fences.",
            }],
        )
        retry_text = "".join(
            block.text for block in retry.content
            if getattr(block, "type", "") == "text"
        ).strip()
        features = json.loads(clean_json(retry_text))

    if not isinstance(features, list):
        raise ValueError("Feature extraction did not return a list.")

    return features


# ── Main Analysis Function ──────────────────────────────────────────────────────

async def analyze_repository(github_url: str) -> dict:
    """
    Full lightweight analysis:
    1. Clone repo (shallow)
    2. Collect file inventory + languages
    3. Extract features from README via Claude Haiku
    4. Return results in the same format as pre-analyzed JSON
    """
    owner, repo = parse_github_url(github_url)
    clone_url = f"https://github.com/{owner}/{repo}.git"

    # Clone into temp dir
    tmp_dir = Path(tempfile.mkdtemp(prefix=f"graft_demo_{owner}_{repo}_"))

    try:
        # Shallow clone in a thread to not block the event loop
        loop = asyncio.get_running_loop()

        def _clone():
            from git import Repo
            env = os.environ.copy()
            env["GIT_TERMINAL_PROMPT"] = "0"
            Repo.clone_from(clone_url, str(tmp_dir), depth=1, multi_options=["--single-branch"], env=env)

        logger.info(f"Cloning {owner}/{repo}...")
        await loop.run_in_executor(None, _clone)

        # Collect inventory
        logger.info(f"Collecting file inventory...")
        files, readme, languages = await loop.run_in_executor(None, collect_inventory, tmp_dir)

        if not readme:
            readme = f"{owner}/{repo} - a GitHub repository"

        # Extract features via Claude
        logger.info(f"Extracting features via Claude Haiku...")
        features = await extract_features(readme)

        return {
            "status": "success",
            "repo_name": repo,
            "repo_owner": owner,
            "github_url": github_url,
            "file_count": len(files),
            "languages_detected": languages,
            "features": features,
            "traces": {},
        }

    except Exception as exc:
        logger.error(f"Analysis failed: {exc}")
        raise

    finally:
        # Clean up cloned repo
        shutil.rmtree(tmp_dir, ignore_errors=True)
