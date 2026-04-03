import asyncio
import shutil
from datetime import datetime, timedelta, timezone

from store.session_store import SessionStore
from utils.file_utils import GRAFT_BUNDLES_ROOT, GRAFT_TMP_ROOT

CLEANUP_INTERVAL_SECONDS = 30 * 60
SESSION_TTL = timedelta(hours=2)


async def cleanup_worker(session_store: SessionStore) -> None:
    while True:
        await cleanup_expired_sessions(session_store)
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)


async def cleanup_expired_sessions(session_store: SessionStore) -> None:
    cutoff = datetime.now(timezone.utc) - SESSION_TTL
    active_sessions = {session.session_id: session for session in await session_store.list_sessions()}

    for session_id, session in active_sessions.items():
        try:
            modified = datetime.fromtimestamp(session.clone_path.stat().st_mtime, tz=timezone.utc)
        except FileNotFoundError:
            await session_store.drop_session(session_id)
            continue
        if modified < cutoff:
            shutil.rmtree(session.clone_path, ignore_errors=True)
            for bundle_path in GRAFT_BUNDLES_ROOT.glob(f"{session_id}_*.zip"):
                bundle_path.unlink(missing_ok=True)
            await session_store.drop_session(session_id)

    for child in GRAFT_TMP_ROOT.iterdir():
        if child == GRAFT_BUNDLES_ROOT or not child.is_dir():
            continue
        modified = datetime.fromtimestamp(child.stat().st_mtime, tz=timezone.utc)
        if modified < cutoff:
            shutil.rmtree(child, ignore_errors=True)

    for bundle_path in GRAFT_BUNDLES_ROOT.glob("*.zip"):
        modified = datetime.fromtimestamp(bundle_path.stat().st_mtime, tz=timezone.utc)
        if modified < cutoff:
            bundle_path.unlink(missing_ok=True)
