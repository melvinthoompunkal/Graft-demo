import asyncio
import json
import logging
import os
from typing import Any

from anthropic import APIError, AsyncAnthropic
from dotenv import load_dotenv

from utils.errors import AppError

load_dotenv()
logger = logging.getLogger(__name__)

# ── Models ──────────────────────────────────────────────────────────────────────

SONNET_MODEL = "claude-sonnet-4-20250514"
HAIKU_MODEL = "claude-haiku-3-5-20241022"

# Token threshold: if the candidate payload is under this, use a single Sonnet
# call (original behavior). Above this, switch to chunked Haiku sub-agents.
SINGLE_CALL_TOKEN_LIMIT = 20_000

# Target tokens per chunk sent to a Haiku sub-agent.
CHUNK_TOKEN_TARGET = 15_000

# ── System Prompts ──────────────────────────────────────────────────────────────

FEATURE_SYSTEM_PROMPT = (
    "You are a senior software engineer analyzing a GitHub repository's README. "
    "Extract a structured list of the distinct features or capabilities this project has. "
    "For each feature, give it: a short slug (snake_case), a human-readable name, and a one-sentence description of what it does. "
    "Return ONLY a JSON array with objects shaped as {slug, name, description}. No preamble, no markdown."
)

CANDIDATE_SYSTEM_PROMPT = (
    "You are a senior engineer. Given this file tree and the feature described, identify which files are most likely "
    "to contain the implementation of this feature. Return ONLY a JSON array of relative file paths, ordered from most "
    "to least relevant. Max 15 files."
)

TRACE_SYSTEM_PROMPT = (
    "You are a senior engineer tracing a feature implementation across a codebase. "
    "Return ONLY raw JSON with this shape: "
    "{"
    '"entry_point": {"file": "relative/path", "function": "name"}, '
    '"call_chain": [{"file": "relative/path", "function": "name", "line_start": 1, "line_end": 2, "role": "purpose"}], '
    '"third_party_deps": ["dep"], '
    '"env_vars": ["ENV_NAME"], '
    '"explanation": "step-by-step explanation"'
    "}. "
    "Pick the single most likely entry point, include only load-bearing functions/files, and keep line ranges precise."
)

# Sub-agent prompt: Haiku analyzes one chunk of files and extracts partial trace data.
SUB_AGENT_SYSTEM_PROMPT = (
    "You are a code analysis sub-agent. You will receive a SUBSET of files from a larger codebase. "
    "Your job is to identify, within ONLY these files, any functions, classes, or code paths that are "
    "relevant to the described feature. "
    "Return ONLY raw JSON with this shape: "
    "{"
    '"relevant_items": [{"file": "relative/path", "function": "name", "line_start": 1, "line_end": 2, "role": "what this does for the feature"}], '
    '"entry_point_candidates": [{"file": "relative/path", "function": "name", "confidence": "high|medium|low"}], '
    '"third_party_deps": ["dep"], '
    '"env_vars": ["ENV_NAME"], '
    '"summary": "brief summary of what these files contribute to the feature"'
    "}. "
    "Be precise with line numbers. Only include items genuinely relevant to the feature. "
    "If none of these files are relevant, return empty arrays and say so in the summary."
)

# Synthesis prompt: Sonnet merges sub-agent results into one final trace.
SYNTHESIS_SYSTEM_PROMPT = (
    "You are a senior engineer synthesizing a feature trace from multiple analysis reports. "
    "Each report analyzed a different subset of files from the same codebase. "
    "Your job is to merge them into ONE coherent trace. "
    "Return ONLY raw JSON with this shape: "
    "{"
    '"entry_point": {"file": "relative/path", "function": "name"}, '
    '"call_chain": [{"file": "relative/path", "function": "name", "line_start": 1, "line_end": 2, "role": "purpose"}], '
    '"third_party_deps": ["dep"], '
    '"env_vars": ["ENV_NAME"], '
    '"explanation": "step-by-step explanation of how the feature works end-to-end"'
    "}. "
    "Order the call_chain from entry point through the execution flow. "
    "Deduplicate dependencies and env vars. Pick the single best entry point. "
    "Write a clear explanation that a student could follow."
)


# ── Helpers ─────────────────────────────────────────────────────────────────────

def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~1 token per 3.5 characters for code."""
    return int(len(text) / 3.5)


def chunk_files(candidate_files: list[tuple[str, str]], token_target: int = CHUNK_TOKEN_TARGET) -> list[list[tuple[str, str]]]:
    """Split candidate files into chunks that each fit under the token target."""
    chunks: list[list[tuple[str, str]]] = []
    current_chunk: list[tuple[str, str]] = []
    current_tokens = 0

    for path, content in candidate_files:
        file_tokens = estimate_tokens(content)

        # If a single file exceeds the target, truncate it but still give it its own chunk
        if file_tokens > token_target:
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = []
                current_tokens = 0

            # Truncate to fit: keep the first ~token_target worth of characters
            max_chars = int(token_target * 3.5)
            truncated = content[:max_chars] + "\n\n# ... [FILE TRUNCATED — too large for single chunk] ..."
            chunks.append([(path, truncated)])
            continue

        # If adding this file would exceed the target, start a new chunk
        if current_tokens + file_tokens > token_target and current_chunk:
            chunks.append(current_chunk)
            current_chunk = []
            current_tokens = 0

        current_chunk.append((path, content))
        current_tokens += file_tokens

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def get_claude_client() -> AsyncAnthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise AppError("missing_configuration", "ANTHROPIC_API_KEY is not set.", 500)
    return AsyncAnthropic(api_key=api_key)


# ── Core API Helpers ────────────────────────────────────────────────────────────

async def _request_json(system_prompt: str, user_prompt: str, error_label: str, model: str = SONNET_MODEL, max_tokens: int = 4096) -> Any:
    """Make a Claude API call and parse the JSON response."""
    client = get_claude_client()

    async def do_request(prompt: str) -> str:
        try:
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
            )
        except APIError as exc:
            raise AppError(error_label, f"Claude API request failed: {exc}", 502) from exc
        except Exception as exc:
            raise AppError(error_label, f"Unexpected Claude API failure: {exc}", 502) from exc

        text_chunks = [block.text for block in response.content if getattr(block, "type", "") == "text"]
        if not text_chunks:
            raise AppError(error_label, "Claude returned an empty response.", 502)
        return "".join(text_chunks).strip()

    raw = await do_request(user_prompt)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        retry_prompt = f"{user_prompt}\n\nIMPORTANT: return ONLY raw JSON, no markdown fences, no commentary."
        retry_raw = await do_request(retry_prompt)
        try:
            return json.loads(retry_raw)
        except json.JSONDecodeError as exc:
            raise AppError(error_label, "Claude returned malformed JSON twice.", 502) from exc


# ── Public API Functions ────────────────────────────────────────────────────────

async def extract_features_from_readme(readme_content: str) -> list[dict[str, str]]:
    result = await _request_json(
        FEATURE_SYSTEM_PROMPT,
        f"README content:\n{readme_content}",
        "feature_extraction_failed",
    )
    if not isinstance(result, list):
        raise AppError("feature_extraction_failed", "Claude feature extraction response was not a JSON array.", 502)
    return result


async def identify_candidate_files(
    file_tree: list[dict[str, Any]],
    feature_name: str,
    feature_description: str,
    natural_language_query: str,
) -> list[str]:
    noisy_exts = {".json", ".md", ".txt", ".csv", ".yml", ".yaml", ".xml", ".svg", ".lock", ".png", ".jpg", ".map"}
    filtered_tree = [item for item in file_tree if item.get("extension", "").lower() not in noisy_exts]
    if not filtered_tree:
        filtered_tree = file_tree

    serialized_tree = "\n".join(f"- {item['path']} ({item['extension'] or 'no_ext'})" for item in filtered_tree)
    
    max_chars = 52500  # ~15,000 tokens
    if len(serialized_tree) > max_chars:
        serialized_tree = serialized_tree[:max_chars] + "\n... [TRUNCATED - REPOSITORY TOO LARGE]"

    result = await _request_json(
        CANDIDATE_SYSTEM_PROMPT,
        (
            f"Feature name: {feature_name}\n"
            f"Feature description: {feature_description}\n"
            f"User query: {natural_language_query}\n"
            f"File tree:\n{serialized_tree}"
        ),
        "candidate_identification_failed",
    )
    if not isinstance(result, list):
        raise AppError("candidate_identification_failed", "Claude candidate identification response was not a JSON array.", 502)
    return [str(item) for item in result[:15]]


# ── Sub-Agent: Analyze a single file chunk ──────────────────────────────────────

async def _analyze_chunk(
    chunk_index: int,
    chunk_files: list[tuple[str, str]],
    feature_name: str,
    feature_description: str,
    query: str,
    skeleton_map: str | None = None,
) -> dict[str, Any]:
    """Have Haiku analyze one chunk of files for feature-relevant code."""
    file_payload = "\n\n".join(
        f"### FILE: {path} ###\n{content}" for path, content in chunk_files
    )

    user_prompt = (
        f"Feature name: {feature_name}\n"
        f"Feature description: {feature_description}\n"
        f"User query: {query}\n\n"
    )
    if skeleton_map:
        user_prompt += f"Global Context Skeleton:\n{skeleton_map}\n\n"
    
    user_prompt += f"Files to analyze (chunk {chunk_index + 1}):\n{file_payload}"

    logger.info(f"Sub-agent chunk {chunk_index + 1}: {len(chunk_files)} files, ~{estimate_tokens(file_payload)} tokens")

    try:
        result = await _request_json(
            SUB_AGENT_SYSTEM_PROMPT,
            user_prompt,
            f"chunk_analysis_failed_{chunk_index}",
            model=HAIKU_MODEL,
            max_tokens=4096,
        )
    except AppError:
        # If one chunk fails, return an empty result rather than crashing the whole trace
        logger.warning(f"Sub-agent chunk {chunk_index + 1} failed, returning empty result")
        return {
            "relevant_items": [],
            "entry_point_candidates": [],
            "third_party_deps": [],
            "env_vars": [],
            "summary": f"Chunk {chunk_index + 1} analysis failed.",
        }

    if not isinstance(result, dict):
        return {
            "relevant_items": [],
            "entry_point_candidates": [],
            "third_party_deps": [],
            "env_vars": [],
            "summary": f"Chunk {chunk_index + 1} returned unexpected format.",
        }

    return result


# ── Synthesis: Merge sub-agent results ──────────────────────────────────────────

async def _synthesize_chunk_results(
    feature_name: str,
    feature_description: str,
    query: str,
    chunk_results: list[dict[str, Any]],
    skeleton_map: str | None = None,
) -> dict[str, Any]:
    """Have Sonnet merge all chunk analysis results into one coherent trace."""
    # Build a compact summary of all chunk results
    summaries = []
    for i, result in enumerate(chunk_results):
        chunk_summary = {
            "chunk": i + 1,
            "relevant_items": result.get("relevant_items", []),
            "entry_point_candidates": result.get("entry_point_candidates", []),
            "third_party_deps": result.get("third_party_deps", []),
            "env_vars": result.get("env_vars", []),
            "summary": result.get("summary", ""),
        }
        summaries.append(chunk_summary)

    user_prompt = (
        f"Feature name: {feature_name}\n"
        f"Feature description: {feature_description}\n"
        f"User query: {query}\n\n"
    )
    if skeleton_map:
        user_prompt += f"Global Context Skeleton:\n{skeleton_map}\n\n"
    
    user_prompt += (
        f"Sub-agent analysis reports from {len(chunk_results)} file chunks:\n"
        f"{json.dumps(summaries, indent=2)}"
    )

    synthesis_tokens = estimate_tokens(user_prompt)
    logger.info(f"Synthesis call: {len(chunk_results)} chunks, ~{synthesis_tokens} tokens")

    result = await _request_json(
        SYNTHESIS_SYSTEM_PROMPT,
        user_prompt,
        "trace_synthesis_failed",
        model=SONNET_MODEL,
        max_tokens=4096,
    )

    if not isinstance(result, dict):
        raise AppError("trace_synthesis_failed", "Synthesis returned unexpected format.", 502)

    return result


# ── Main Trace Entry Point ──────────────────────────────────────────────────────

async def deep_trace_feature(
    feature_name: str,
    feature_description: str,
    natural_language_query: str,
    candidate_payload: str,
    candidate_files: list[tuple[str, str]] | None = None,
    skeleton_map: str | None = None,
) -> dict[str, Any]:
    """
    Trace a feature through the codebase.

    For small payloads (< SINGLE_CALL_TOKEN_LIMIT tokens), uses a single Sonnet
    call — identical to the original behavior.

    For large payloads, splits files into chunks, fans out Haiku sub-agents in
    parallel, then synthesizes results with Sonnet.
    """
    payload_tokens = estimate_tokens(candidate_payload)
    logger.info(f"Trace payload: ~{payload_tokens} tokens ({len(candidate_payload)} chars)")

    # ── Small repo: original single-call path ──
    if payload_tokens <= SINGLE_CALL_TOKEN_LIMIT:
        logger.info("Using single-call path (payload fits in Sonnet context)")
        
        user_prompt = (
            f"Feature name: {feature_name}\n"
            f"Feature description: {feature_description}\n"
            f"User query: {natural_language_query}\n\n"
        )
        if skeleton_map:
            user_prompt += f"Global Context Skeleton:\n{skeleton_map}\n\n"
        user_prompt += f"Candidate file contents:\n{candidate_payload}"
        
        result = await _request_json(
            TRACE_SYSTEM_PROMPT,
            user_prompt,
            "feature_trace_failed",
        )
        if not isinstance(result, dict):
            raise AppError("feature_trace_failed", "Claude deep trace response was not a JSON object.", 502)
        return result

    # ── Large repo: chunked sub-agent path ──
    if candidate_files is None:
        raise AppError(
            "feature_trace_failed",
            "Internal error: candidate_files required for chunked tracing.",
            500,
        )

    chunks = chunk_files(candidate_files)
    logger.info(f"Using chunked path: {len(chunks)} chunks from {len(candidate_files)} files")

    # Fan out sub-agent calls with concurrency control to avoid hitting TPM rate limits
    sem = asyncio.Semaphore(2)

    async def _analyze_with_sem(idx, c):
        async with sem:
            return await _analyze_chunk(
                idx, c, feature_name, feature_description, natural_language_query, skeleton_map
            )

    tasks = [
        _analyze_with_sem(i, chunk)
        for i, chunk in enumerate(chunks)
    ]
    chunk_results = await asyncio.gather(*tasks)

    # Filter out completely empty results
    non_empty = [
        r for r in chunk_results
        if r.get("relevant_items") or r.get("entry_point_candidates")
    ]

    if not non_empty:
        # If all chunks found nothing relevant, fall back to a simpler error
        raise AppError(
            "feature_trace_failed",
            "Sub-agents found no relevant code across any file chunks for this feature.",
            400,
        )

    # Synthesize into final trace
    return await _synthesize_chunk_results(
        feature_name,
        feature_description,
        natural_language_query,
        list(chunk_results),  # send all results, including empty, for completeness
        skeleton_map=skeleton_map,
    )
