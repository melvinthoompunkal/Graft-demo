from fastapi import APIRouter
from fastapi.responses import FileResponse

from models.requests import BundleRequest, IngestRequest, TraceRequest
from models.responses import DeleteSessionResponse, ErrorResponse, IngestResponse, SessionResponse, TraceResponse
from services.bundle_service import create_bundle
from services.github_service import ingest_repository
from services.tracer_service import trace_feature
from store.session_store import session_store
from utils.errors import AppError

router = APIRouter(prefix="/api/repo", tags=["repo"])


@router.post(
    "/ingest",
    response_model=IngestResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def ingest_repo(request: IngestRequest) -> IngestResponse:
    return await ingest_repository(request, session_store)


@router.post(
    "/trace",
    response_model=TraceResponse,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def trace_repo_feature(request: TraceRequest) -> TraceResponse:
    return await trace_feature(request, session_store)


@router.post(
    "/bundle",
    responses={200: {"content": {"application/zip": {}}}, 400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
)
async def bundle_repo_feature(request: BundleRequest) -> FileResponse:
    bundle_info = await create_bundle(request, session_store)
    return FileResponse(
        path=str(bundle_info.path),
        filename=bundle_info.download_name,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{bundle_info.download_name}"'},
    )


@router.get(
    "/session/{session_id}",
    response_model=SessionResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_session(session_id: str) -> SessionResponse:
    session = await session_store.get_session(session_id)
    if session is None:
        raise AppError("session_not_found", f"Session '{session_id}' does not exist.", 404)

    return SessionResponse(
        session_id=session_id,
        repo_name=session.repo_name,
        repo_owner=session.repo_owner,
        github_url=session.github_url,
        features=session.features,
        traced_features=sorted(session.traces.keys()),
        file_count=session.file_count,
        languages_detected=session.languages_detected,
    )


@router.delete(
    "/session/{session_id}",
    response_model=DeleteSessionResponse,
    responses={404: {"model": ErrorResponse}},
)
async def delete_session(session_id: str) -> DeleteSessionResponse:
    deleted = await session_store.delete_session(session_id)
    if not deleted:
        raise AppError("session_not_found", f"Session '{session_id}' does not exist.", 404)
    return DeleteSessionResponse(deleted=True)
