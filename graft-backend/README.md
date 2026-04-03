# Graft Backend

FastAPI backend for Graft, an AI-powered feature extraction service that ingests GitHub repositories, identifies product features from the README, traces implementation paths for a requested feature, and generates a portable code bundle.

The backend also serves the compiled React frontend from the sibling `graft-frontend/dist/` directory when present.

## Requirements

- Python 3.11+
- An Anthropic API key
- Optional GitHub token for private repositories or higher API limits

## Setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Copy `.env.example` to `.env` and set:

- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN` (optional)

## Run Locally

```bash
uvicorn main:app --reload
```

Run the command from the `graft-backend` directory.

Then open `http://localhost:8000/` for the frontend workspace or `http://localhost:8000/docs` for the API docs.

## Frontend

The frontend lives in `../graft-frontend/` and uses React, JSX, Tailwind CSS, PostCSS, and Vite.

For frontend development:

```bash
cd ../graft-frontend
npm install
npm run dev
```

For a production build that FastAPI can serve:

```bash
cd ../graft-frontend
npm run build
```

## API Endpoints

- `GET /health`
- `POST /api/repo/ingest`
- `POST /api/repo/trace`
- `POST /api/repo/bundle`
- `GET /api/repo/session/{session_id}`
- `DELETE /api/repo/session/{session_id}`

## Notes

- Repositories are cloned into `/tmp/graft/`.
- Bundles are generated under `/tmp/graft/bundles/`.
- A background cleanup task removes stale sessions and bundles older than two hours.
