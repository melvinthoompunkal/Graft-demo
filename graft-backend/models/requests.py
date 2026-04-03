from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    github_url: str = Field(..., description="Public or private GitHub repository URL.")
    github_token: str | None = Field(default=None, description="Optional GitHub token for private repositories.")


class TraceRequest(BaseModel):
    session_id: str
    feature_slug: str
    natural_language_query: str


class BundleRequest(BaseModel):
    session_id: str
    feature_slug: str
