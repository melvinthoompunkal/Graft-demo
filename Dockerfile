# ── Stage 1: Build React frontend ────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + static frontend ──────────────────
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source and static data
COPY backend/ .

# Copy built frontend into /app/static
COPY --from=frontend-build /app/frontend/dist ./static

ENV PORT=8000
EXPOSE ${PORT}
CMD ["python", "main.py"]
