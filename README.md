# Graft

**Graft** is an AI-powered feature extraction platform that ingests GitHub repositories and intelligently identifies product features, traces structural implementation paths, and generates portable code bundles.

Built to simplify repository analysis and codebase offloading, Graft consists of a chunked sub-agent AI backend capable of processing large repositories without hitting token overflow errors, paired with a React visualization interface.

## Architecture

The project is structured entirely as a monorepo containing two main halves:

### 1. `graft-backend` (FastAPI / Python)
The intelligence layer. This handles the complex workflows like routing, repository cloning, Anthropic integration, token management, and file traversal using python and asynchronous sub-agents. 

**Key Features:**
- **Dynamic Chunking System:** Automatically switches between single-call and parallel chunked-call formats based on repository size, bypassing Anthropic API limits (like `400: prompt too long` or `429: rate limit`).
- **Feature AI Tracing:** Traces implementation paths backward from a specific feature request.
- **RESTful Endpoints:** Serves API endpoints for ingestion, tracing, and bundling. Also serves the built frontend application.

### 2. `graft-frontend` (React / Vite)
The visualization layer. Built with React and structured by Vite, this interactive platform allows users to explore repository maps, trace workspace sessions, and manage feature bundles directly from an interactive web interface.

**Key Features:**
- Built using React 18 and Tailwind CSS for rapid styling.
- Contains interactive `.jsx` components for repository maps (`RepoMapPage`) and trace sessions (`TracesPage`, `TraceWorkspace`).

## Getting Started

Because the project is separated into a frontend and a backend, they must be set up individually. 

### Backend Setup
```bash
cd graft-backend
pip install -r requirements.txt
cp .env.example .env
```
*(Make sure you open the `.env` file and insert your `ANTHROPIC_API_KEY` and optional `GITHUB_TOKEN`)*

To run the backend server on `localhost:8000`:
```bash
uvicorn main:app --reload
```

### Frontend Setup
In a new terminal:
```bash
cd graft-frontend
npm install
npm run dev
```
You can now access the frontend development server via Vite. 

*Alternatively, if you run `npm run build`, the React bundle will be served dynamically by the FastAPI backend!*
