import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.analyze_service import analyze_repository, ANTHROPIC_API_KEY

router = APIRouter(prefix="/api/demo", tags=["demo"])
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_json(filename: str) -> dict | list:
    filepath = DATA_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Data file '{filename}' not found.")
    with filepath.open("r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/repos")
async def list_repos() -> list[dict]:
    """Return the manifest of all pre-analyzed repositories."""
    return _load_json("_index.json")


@router.get("/repos/{slug}")
async def get_repo(slug: str) -> dict:
    """Return the full analysis JSON for a specific repository."""
    try:
        return _load_json(f"{slug}.json")
    except HTTPException:
        raise HTTPException(status_code=404, detail=f"Repository '{slug}' not found in demo library.")


@router.get("/repos/{slug}/download")
async def download_repo(slug: str):
    """Download the full analysis JSON as a file attachment."""
    filepath = DATA_DIR / f"{slug}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail=f"Repository '{slug}' not found in demo library.")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(filepath),
        media_type="application/json",
        filename=f"{slug}_analysis.json",
        headers={"Content-Disposition": f'attachment; filename="{slug}_analysis.json"'},
    )


@router.get("/bundles")
async def list_bundles() -> list[dict]:
    """Return only the bundle entries from the library."""
    all_repos = _load_json("_index.json")
    return [r for r in all_repos if r.get("category") == "bundle"]


@router.get("/quota")
async def get_quota(request: Request) -> dict:
    """Return the remaining rate limit for the caller's IP."""
    from middleware.rate_limit import rate_limiter
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    info = rate_limiter.get_info(client_ip)
    
    return {
        "limit": info["limit"],
        "remaining": info["remaining"],
        "reset_in": info["reset_in"],
        "live_enabled": bool(ANTHROPIC_API_KEY),
    }


class AnalyzeRequest(BaseModel):
    github_url: str


@router.post("/analyze")
async def analyze_repo(request: AnalyzeRequest) -> dict:
    """
    Live analysis endpoint (rate-limited to 3 requests/IP/day).
    Shallow-clones the repo, extracts features via Claude Haiku.
    """
    if not ANTHROPIC_API_KEY:
        return {
            "status": "disabled",
            "detail": "Live analysis is not configured on this instance. Set ANTHROPIC_API_KEY to enable.",
            "github_url": request.github_url,
        }

    try:
        result = await analyze_repository(request.github_url)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
