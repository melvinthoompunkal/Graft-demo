from pydantic import BaseModel


class ErrorResponse(BaseModel):
    error: str
    detail: str


class FeatureResponse(BaseModel):
    slug: str
    name: str
    description: str


class IngestResponse(BaseModel):
    session_id: str
    repo_name: str
    features: list[FeatureResponse]
    file_count: int
    languages_detected: list[str]


class EntryPoint(BaseModel):
    file: str
    function: str


class CallChainItem(BaseModel):
    file: str
    function: str
    line_start: int
    line_end: int
    role: str


class TraceResponse(BaseModel):
    entry_point: EntryPoint
    call_chain: list[CallChainItem]
    third_party_deps: list[str]
    env_vars: list[str]
    explanation: str
    candidate_files: list[str] = []
    graph_edges: list[list[str]] = []


class SessionResponse(BaseModel):
    session_id: str
    repo_name: str
    repo_owner: str
    github_url: str
    features: list[FeatureResponse]
    traced_features: list[str]
    file_count: int
    languages_detected: list[str]


class DeleteSessionResponse(BaseModel):
    deleted: bool


class HealthResponse(BaseModel):
    status: str
    version: str
