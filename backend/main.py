import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from middleware.rate_limit import rate_limiter
from routers.demo import router as demo_router

APP_VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(_: FastAPI):
    cleanup_task = asyncio.create_task(rate_limiter.cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Graft Demo",
    description="Pre-analyzed repository exploration demo for Graft",
    version=APP_VERSION,
    lifespan=lifespan,
)

static_dir = Path(__file__).resolve().parent / "static"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/api/demo/analyze" and request.method == "POST":
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        allowed, info = rate_limiter.check(client_ip)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limited",
                    "detail": f"Rate limit exceeded. {info['remaining']} requests remaining. Resets in {info['reset_in']} seconds.",
                    "remaining": info["remaining"],
                    "reset_in": info["reset_in"],
                },
                headers={"Retry-After": str(info["reset_in"])},
            )
    return await call_next(request)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "version": APP_VERSION}





app.include_router(demo_router)

if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")
