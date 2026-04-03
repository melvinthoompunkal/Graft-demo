import asyncio
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import networkx as nx

from models.requests import TraceRequest
from models.responses import CallChainItem, EntryPoint, TraceResponse
from services.claude_service import deep_trace_feature, identify_candidate_files
from store.session_store import SessionStore
from utils.errors import AppError
from utils.file_utils import detect_language_from_path, extract_env_vars, extract_third_party_imports

try:
    from tree_sitter_languages import get_parser
except ImportError:
    get_parser = None


SUPPORTED_LANGUAGES = {"python", "javascript", "typescript", "go", "java"}


@dataclass
class Definition:
    file: str
    name: str
    line_start: int
    line_end: int
    body: str
    kind: str


def _safe_read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")


def _walk_tree_sitter(node: Any, source: bytes, file_path: str, definitions: list[Definition]) -> None:
    interesting_types = {
        "function_definition",
        "class_definition",
        "function_declaration",
        "method_definition",
        "lexical_declaration",
    }
    if node.type in interesting_types:
        name_node = node.child_by_field_name("name")
        if name_node is None and node.type == "lexical_declaration":
            text = source[node.start_byte : node.end_byte].decode("utf-8", errors="ignore")
            match = re.search(r"(const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(", text)
            if match:
                name = match.group(2)
                definitions.append(
                    Definition(
                        file=file_path,
                        name=name,
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        body=text,
                        kind=node.type,
                    )
                )
        elif name_node is not None:
            name = source[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="ignore")
            body = source[node.start_byte : node.end_byte].decode("utf-8", errors="ignore")
            definitions.append(
                Definition(
                    file=file_path,
                    name=name,
                    line_start=node.start_point[0] + 1,
                    line_end=node.end_point[0] + 1,
                    body=body,
                    kind=node.type,
                )
            )

    for child in node.children:
        _walk_tree_sitter(child, source, file_path, definitions)


def _extract_with_tree_sitter(language: str, content: str, file_path: str) -> list[Definition]:
    if get_parser is None:
        raise RuntimeError("tree_sitter_languages is not installed.")
    parser = get_parser(language)
    source = content.encode("utf-8")
    tree = parser.parse(source)
    definitions: list[Definition] = []
    _walk_tree_sitter(tree.root_node, source, file_path, definitions)
    return definitions


def _extract_with_regex(language: str, content: str, file_path: str) -> list[Definition]:
    patterns = [
        re.compile(r"^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)", re.MULTILINE),
        re.compile(r"^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)", re.MULTILINE),
        re.compile(r"^\s*function\s+([A-Za-z_][A-Za-z0-9_]*)", re.MULTILINE),
        re.compile(r"^\s*(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\(?", re.MULTILINE),
        re.compile(r"^\s*func\s+([A-Za-z_][A-Za-z0-9_]*)", re.MULTILINE),
    ]
    definitions: list[Definition] = []
    lines = content.splitlines()
    for pattern in patterns:
        for match in pattern.finditer(content):
            name = match.group(1)
            line_start = content[: match.start()].count("\n") + 1
            line_end = min(len(lines), line_start + 20)
            body = "\n".join(lines[line_start - 1 : line_end])
            definitions.append(
                Definition(
                    file=file_path,
                    name=name,
                    line_start=line_start,
                    line_end=line_end,
                    body=body,
                    kind=language or "regex",
                )
            )
    seen: set[tuple[str, int]] = set()
    deduped: list[Definition] = []
    for definition in definitions:
        key = (definition.name, definition.line_start)
        if key not in seen:
            deduped.append(definition)
            seen.add(key)
    return deduped


def extract_definitions(content: str, file_path: str) -> list[Definition]:
    language = detect_language_from_path(file_path)
    if language not in SUPPORTED_LANGUAGES:
        return _extract_with_regex(language, content, file_path)

    try:
        return _extract_with_tree_sitter(language, content, file_path)
    except Exception:
        return _extract_with_regex(language, content, file_path)


def build_call_graph(definitions: list[Definition]) -> nx.DiGraph:
    graph = nx.DiGraph()
    by_name: dict[str, list[Definition]] = {}
    for definition in definitions:
        by_name.setdefault(definition.name, []).append(definition)
    for definition in definitions:
        node_id = f"{definition.file}:{definition.name}"
        graph.add_node(
            node_id,
            file=definition.file,
            function=definition.name,
            line_start=definition.line_start,
            line_end=definition.line_end,
        )
        for callee_name, callees in by_name.items():
            if callee_name == definition.name:
                continue
            if re.search(rf"\b{re.escape(callee_name)}\b", definition.body):
                for callee in callees:
                    graph.add_edge(node_id, f"{callee.file}:{callee.name}")
    return graph


def build_skeleton_map(definitions: list[Definition]) -> str:
    from collections import defaultdict
    by_file = defaultdict(list)
    for d in definitions:
        by_file[d.file].append(d.name)
    lines = ["# Global Symbol Table"]
    for file, symbols in by_file.items():
        lines.append(f"## {file}")
        for s in symbols:
            lines.append(f"- {s}")
    return "\n".join(lines)


def _prepare_candidate_context(candidate_files: list[tuple[str, str]]) -> str:
    return "\n\n".join(f"### FILE: {relative_path} ###\n{content}" for relative_path, content in candidate_files)


def _read_candidate_files(repo_root: Path, candidate_paths: list[str]) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    for relative_path in candidate_paths:
        file_path = repo_root / relative_path
        if file_path.exists() and file_path.is_file():
            candidates.append((relative_path, _safe_read_text(file_path)))
    return candidates


async def trace_feature(request: TraceRequest, session_store: SessionStore) -> TraceResponse:
    session = await session_store.get_session(request.session_id)
    if session is None:
        raise AppError("session_not_found", f"Session '{request.session_id}' does not exist.", 404)

    feature = next((item for item in session.features if item.slug == request.feature_slug), None)
    if feature is None:
        raise AppError("feature_not_found", f"Feature '{request.feature_slug}' does not exist in this session.", 404)

    candidate_paths = await identify_candidate_files(
        session.files,
        feature.name,
        feature.description,
        request.natural_language_query,
    )

    loop = asyncio.get_running_loop()
    candidate_files = await loop.run_in_executor(None, _read_candidate_files, session.clone_path, candidate_paths)
    if not candidate_files:
        raise AppError("trace_failed", "No readable candidate files were identified for this feature.", 400)

    all_definitions: list[Definition] = []
    for relative_path, content in candidate_files:
        all_definitions.extend(extract_definitions(content, relative_path))

    skeleton_map = build_skeleton_map(all_definitions)

    call_graph = build_call_graph(all_definitions)
    candidate_payload = _prepare_candidate_context(candidate_files)
    claude_trace = await deep_trace_feature(
        feature.name,
        feature.description,
        request.natural_language_query,
        candidate_payload,
        candidate_files=candidate_files,
        skeleton_map=skeleton_map,
    )

    entry_point_data = claude_trace.get("entry_point") or {}
    call_chain_data = claude_trace.get("call_chain") or []

    third_party = set(claude_trace.get("third_party_deps") or [])
    env_vars = set(claude_trace.get("env_vars") or [])
    for relative_path, content in candidate_files:
        third_party.update(extract_third_party_imports(relative_path, content))
        env_vars.update(extract_env_vars(content))

    node_lookup = {(definition.file, definition.name): definition for definition in all_definitions}
    call_chain: list[CallChainItem] = []
    for item in call_chain_data:
        file_name = str(item.get("file", ""))
        function_name = str(item.get("function", ""))
        definition = node_lookup.get((file_name, function_name))
        call_chain.append(
            CallChainItem(
                file=file_name,
                function=function_name,
                line_start=int(item.get("line_start") or (definition.line_start if definition else 1)),
                line_end=int(item.get("line_end") or (definition.line_end if definition else 1)),
                role=str(item.get("role", "")),
            )
        )

    trace_response = TraceResponse(
        entry_point=EntryPoint(
            file=str(entry_point_data.get("file", "")),
            function=str(entry_point_data.get("function", "")),
        ),
        call_chain=call_chain,
        third_party_deps=sorted(third_party),
        env_vars=sorted(env_vars),
        explanation=str(claude_trace.get("explanation", "")),
        candidate_files=[path for path, _ in candidate_files],
        graph_edges=[[source, target] for source, target in call_graph.edges()],
    )

    await session_store.save_trace(request.session_id, request.feature_slug, trace_response)
    return trace_response
