import asyncio
import os
import shutil
import uuid
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from git import Repo

from models.requests import IngestRequest
from models.responses import FeatureResponse, IngestResponse
from services.claude_service import extract_features_from_readme
from store.session_store import SessionData, SessionStore
from utils.errors import AppError
from utils.file_utils import (
    GRAFT_TMP_ROOT,
    detect_language,
    is_binary_file,
    is_readme_candidate,
    should_skip_dir,
    should_skip_file,
)

GITHUB_API_URL = "https://api.github.com"


def parse_github_url(github_url: str) -> tuple[str, str]:
    parsed = urlparse(github_url)
    if parsed.netloc.lower() not in {"github.com", "www.github.com"}:
        raise AppError("invalid_github_url", "Only GitHub repository URLs are supported.", 400)

    path_parts = [part for part in parsed.path.strip("/").split("/") if part]
    if len(path_parts) < 2:
        raise AppError("invalid_github_url", "GitHub URL must include both owner and repository name.", 400)

    owner, repo = path_parts[0], path_parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    return owner, repo


async def fetch_repo_metadata(owner: str, repo: str, github_token: str | None) -> dict[str, Any]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "graft-backend",
    }
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.get(f"{GITHUB_API_URL}/repos/{owner}/{repo}", headers=headers)
        except httpx.HTTPError as exc:
            raise AppError("github_request_failed", f"Failed to reach GitHub API: {exc}", 502) from exc

    if response.status_code == 404 and not github_token:
        raise AppError(
            "repository_not_accessible",
            "Repository was not found or is private. Provide a GitHub token for private repositories.",
            401,
        )
    if response.status_code == 404:
        raise AppError("repository_not_found", f"Repository '{owner}/{repo}' was not found.", 404)
    if response.status_code == 401:
        raise AppError("github_auth_failed", "GitHub token is invalid or expired.", 401)
    if response.status_code >= 400:
        raise AppError("github_request_failed", f"GitHub API returned {response.status_code}.", 502)

    data = response.json()
    if data.get("private") and not github_token:
        raise AppError(
            "github_auth_required",
            "This repository is private. Provide a GitHub token to ingest it.",
            401,
        )
    return data


def build_clone_url(owner: str, repo: str, github_token: str | None) -> str:
    if github_token:
        return f"https://oauth2:{github_token}@github.com/{owner}/{repo}.git"
    return f"https://github.com/{owner}/{repo}.git"


def clone_repo_sync(clone_url: str, target_dir: Path) -> None:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    Repo.clone_from(clone_url, str(target_dir), depth=1, multi_options=["--single-branch"], env=env)


def read_readme_in_order(repo_path: Path) -> str:
    for candidate in ("README.md", "README.rst", "README.txt", "readme.md"):
        readme_path = repo_path / candidate
        if readme_path.exists() and readme_path.is_file():
            try:
                return readme_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                return readme_path.read_text(encoding="utf-8", errors="ignore")
    return ""


def collect_repo_inventory(repo_path: Path) -> tuple[list[dict[str, Any]], str]:
    files: list[dict[str, Any]] = []
    readme_content = read_readme_in_order(repo_path)

    for root, dirnames, filenames in os.walk(repo_path):
        root_path = Path(root)
        dirnames[:] = [d for d in dirnames if not should_skip_dir(d)]

        for filename in filenames:
            file_path = root_path / filename
            relative_path = file_path.relative_to(repo_path)

            if should_skip_file(filename, relative_path):
                continue
            if is_binary_file(file_path):
                continue

            stat = file_path.stat()
            try:
                content = file_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                content = file_path.read_text(encoding="utf-8", errors="ignore")

            files.append(
                {
                    "path": relative_path.as_posix(),
                    "extension": file_path.suffix.lower(),
                    "line_count": len(content.splitlines()),
                    "size_bytes": stat.st_size,
                }
            )

    return files, readme_content


async def ingest_repository(request: IngestRequest, session_store: SessionStore) -> IngestResponse:
    github_token = request.github_token or os.getenv("GITHUB_TOKEN")
    owner, repo = parse_github_url(request.github_url)
    metadata = await fetch_repo_metadata(owner, repo, github_token)

    session_id = str(uuid.uuid4())
    target_dir = GRAFT_TMP_ROOT / f"{owner}_{repo}_{session_id}"
    target_dir.mkdir(parents=True, exist_ok=True)

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, clone_repo_sync, build_clone_url(owner, repo, github_token), target_dir)
        files, readme_content = await loop.run_in_executor(None, collect_repo_inventory, target_dir)
    except AppError:
        shutil.rmtree(target_dir, ignore_errors=True)
        raise
    except Exception as exc:
        shutil.rmtree(target_dir, ignore_errors=True)
        raise AppError("repository_clone_failed", f"Failed to clone repository: {exc}", 502) from exc

    if not readme_content:
        readme_content = metadata.get("description") or f"{owner}/{repo}"

    features = await extract_features_from_readme(readme_content)

    language_counts = Counter()
    for item in files:
        language = detect_language(item["extension"])
        if language != "Unknown":
            language_counts[language] += 1
    languages_detected = [lang for lang, _ in language_counts.most_common(5)]

    session = SessionData(
        session_id=session_id,
        repo_owner=owner,
        repo_name=repo,
        github_url=request.github_url,
        clone_path=target_dir,
        repo_private=bool(metadata.get("private")),
        github_token=github_token,
        readme_content=readme_content,
        files=files,
        features=[FeatureResponse(**feature) for feature in features],
        traces={},
        file_count=len(files),
        languages_detected=languages_detected,
    )
    await session_store.upsert_session(session)

    return IngestResponse(
        session_id=session_id,
        repo_name=repo,
        features=session.features,
        file_count=session.file_count,
        languages_detected=languages_detected,
    )
