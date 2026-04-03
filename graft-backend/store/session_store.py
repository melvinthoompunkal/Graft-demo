import asyncio
import shutil
from dataclasses import dataclass
from pathlib import Path

from models.responses import FeatureResponse, TraceResponse
from utils.file_utils import GRAFT_BUNDLES_ROOT


@dataclass
class SessionData:
    session_id: str
    repo_owner: str
    repo_name: str
    github_url: str
    clone_path: Path
    repo_private: bool
    github_token: str | None
    readme_content: str
    files: list[dict]
    features: list[FeatureResponse]
    traces: dict[str, TraceResponse]
    file_count: int
    languages_detected: list[str]


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionData] = {}
        self._lock = asyncio.Lock()

    async def upsert_session(self, session: SessionData) -> None:
        async with self._lock:
            self._sessions[session.session_id] = session

    async def get_session(self, session_id: str) -> SessionData | None:
        async with self._lock:
            return self._sessions.get(session_id)

    async def save_trace(self, session_id: str, feature_slug: str, trace: TraceResponse) -> None:
        async with self._lock:
            self._sessions[session_id].traces[feature_slug] = trace

    async def delete_session(self, session_id: str) -> bool:
        async with self._lock:
            session = self._sessions.pop(session_id, None)
        if session is None:
            return False

        shutil.rmtree(session.clone_path, ignore_errors=True)
        for bundle_path in GRAFT_BUNDLES_ROOT.glob(f"{session_id}_*.zip"):
            bundle_path.unlink(missing_ok=True)
        return True

    async def list_sessions(self) -> list[SessionData]:
        async with self._lock:
            return list(self._sessions.values())

    async def drop_session(self, session_id: str) -> None:
        async with self._lock:
            self._sessions.pop(session_id, None)


session_store = SessionStore()
