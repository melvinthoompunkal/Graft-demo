# Graft Demo

Hosted demo layer for [Graft](https://github.com/your-username/graft) — an AI-powered repository analysis tool.

## What is this?

A zero-cost demo that serves pre-analyzed data from 10 popular open source Python repositories. Users can browse extracted features, implementation traces, dependency maps, and AI-generated explanations — all from static JSON, with zero API calls.

## Architecture

```
graft-demo/
├── backend/          # FastAPI backend
│   ├── main.py       # App entry + middleware
│   ├── routers/      # API routes
│   ├── middleware/    # Rate limiter
│   └── data/         # Pre-analyzed static JSON (10 repos)
├── frontend/         # React + Vite + Tailwind
│   └── src/
│       ├── pages/    # Landing, Library, RepoDetail, TryYourOwn
│       └── components/
├── Dockerfile        # Multi-stage build
└── railway.toml      # Railway deployment config
```

## Local Development

### Backend
```bash
cd graft-demo/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

### Frontend
```bash
cd graft-demo/frontend
npm install
npm run dev
```

The frontend dev server runs on port 5174 and proxies API requests to the backend on port 8080.

## Deploy to Railway

1. Push the `graft-demo/` directory to a GitHub repo (or subdirectory)
2. Connect to Railway
3. Railway will detect `railway.toml` and build from the Dockerfile
4. No environment variables required (the demo uses static JSON only)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Healthcheck |
| GET | `/api/demo/repos` | List all pre-analyzed repos |
| GET | `/api/demo/repos/{slug}` | Full analysis for one repo |
| GET | `/api/demo/quota` | Check remaining rate limit |
| POST | `/api/demo/analyze` | Live analysis (rate-limited, stub) |

## Pre-Analyzed Repos

| Repo | Owner | Features | Traces |
|------|-------|----------|--------|
| requests | psf | 6 | 3 |
| flask | pallets | 7 | 3 |
| fastapi | fastapi | 8 | 3 |
| httpx | encode | 6 | 2 |
| rich | Textualize | 7 | 2 |
| pydantic | pydantic | 7 | 2 |
| black | psf | 5 | 2 |
| click | pallets | 6 | 2 |
| typer | fastapi | 5 | 2 |
| textual | Textualize | 8 | 2 |
