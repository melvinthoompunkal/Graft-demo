import asyncio
import json
import re
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

from models.requests import BundleRequest
from store.session_store import SessionStore
from utils.errors import AppError
from utils.file_utils import GRAFT_BUNDLES_ROOT

try:
    import tomllib
except ModuleNotFoundError:  # pragma: no cover
    import tomli as tomllib


PACKAGE_FILES = ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "pom.xml", "Cargo.toml"]


@dataclass
class BundleResult:
    path: Path
    download_name: str


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")


def _extract_import_lines(file_path: str, content: str) -> list[str]:
    suffix = Path(file_path).suffix.lower()
    imports: list[str] = []
    for line in content.splitlines():
        stripped = line.strip()
        if suffix == ".py" and (stripped.startswith("import ") or stripped.startswith("from ")):
            imports.append(line)
        elif suffix in {".js", ".ts", ".jsx", ".tsx"} and (
            stripped.startswith("import ") or (stripped.startswith("const ") and "require(" in stripped)
        ):
            imports.append(line)
        elif suffix == ".go" and (stripped.startswith("import ") or stripped.startswith("package ")):
            imports.append(line)
        elif suffix == ".java" and stripped.startswith("import "):
            imports.append(line)
    return imports


def _slice_file(repo_root: Path, relative_path: str, ranges: list[tuple[int, int]]) -> str:
    full_path = repo_root / relative_path
    content = _read_text(full_path)
    lines = content.splitlines()
    imports = _extract_import_lines(relative_path, content)
    selected: list[str] = []
    for start, end in sorted(ranges):
        start_idx = max(start - 1, 0)
        end_idx = min(end, len(lines))
        selected.extend(lines[start_idx:end_idx])
    merged = "\n".join(imports + ([""] if imports and selected else []) + selected).strip()
    return f"{merged}\n" if merged else ""


def _filter_package_json(path: Path, deps: set[str]) -> str:
    data = json.loads(_read_text(path))
    for section in ("dependencies", "devDependencies", "peerDependencies"):
        section_data = data.get(section, {})
        data[section] = {name: version for name, version in section_data.items() if name in deps}
    return json.dumps(data, indent=2) + "\n"


def _filter_requirements(path: Path, deps: set[str]) -> str:
    lines = []
    for line in _read_text(path).splitlines():
        package_name = re.split(r"[<>=\[]", line.strip(), maxsplit=1)[0].strip()
        if package_name in deps:
            lines.append(line)
    return ("\n".join(lines).strip() + "\n") if lines else ""


def _filter_pyproject(path: Path, deps: set[str]) -> str:
    data = tomllib.loads(_read_text(path))
    lines: list[str] = []
    if "project" in data:
        project_deps = data["project"].get("dependencies", [])
        filtered_project_deps = [dep for dep in project_deps if dep.split()[0] in deps]
        lines.append("[project]")
        if "name" in data["project"]:
            lines.append(f'name = "{data["project"]["name"]}"')
        if filtered_project_deps:
            lines.append("dependencies = [")
            for dep in filtered_project_deps:
                lines.append(f'  "{dep}",')
            lines.append("]")
    if "tool" in data and "poetry" in data["tool"]:
        poetry_deps = data["tool"]["poetry"].get("dependencies", {})
        filtered_poetry_deps = {
            name: version for name, version in poetry_deps.items() if name in deps or name == "python"
        }
        if lines:
            lines.append("")
        lines.append("[tool.poetry.dependencies]")
        for name, version in filtered_poetry_deps.items():
            if isinstance(version, str):
                lines.append(f'{name} = "{version}"')
            else:
                lines.append(f"{name} = {json.dumps(version)}")
    return ("\n".join(lines).strip() + "\n") if lines else ""


def _filter_go_mod(path: Path, deps: set[str]) -> str:
    lines = []
    for line in _read_text(path).splitlines():
        stripped = line.strip()
        if stripped.startswith("module ") or stripped.startswith("go ") or any(dep in stripped for dep in deps):
            lines.append(line)
    return ("\n".join(lines).strip() + "\n") if lines else ""


def _filter_pom_xml(path: Path, deps: set[str]) -> str:
    tree = ElementTree.fromstring(_read_text(path))
    for parent in tree.findall(".//dependencies"):
        for dependency in list(parent):
            artifact = dependency.find("artifactId")
            if artifact is not None and artifact.text not in deps:
                parent.remove(dependency)
    return ElementTree.tostring(tree, encoding="unicode")


def _filter_cargo_toml(path: Path, deps: set[str]) -> str:
    lines = []
    in_deps = False
    for line in _read_text(path).splitlines():
        stripped = line.strip()
        if stripped == "[dependencies]":
            in_deps = True
            lines.append(line)
            continue
        if stripped.startswith("[") and stripped != "[dependencies]":
            in_deps = False
        if not in_deps or any(stripped.startswith(f"{dep} ") or stripped.startswith(f"{dep}=") for dep in deps):
            lines.append(line)
    return ("\n".join(lines).strip() + "\n") if lines else ""


def _filter_dependency_file(repo_root: Path, deps: set[str]) -> tuple[str | None, str | None, str | None]:
    for filename in PACKAGE_FILES:
        candidate = repo_root / filename
        if not candidate.exists():
            continue
        if filename == "package.json":
            return filename, _filter_package_json(candidate, deps), "npm install"
        if filename == "requirements.txt":
            return filename, _filter_requirements(candidate, deps), "pip install -r requirements.txt"
        if filename == "pyproject.toml":
            return filename, _filter_pyproject(candidate, deps), "pip install ."
        if filename == "go.mod":
            return filename, _filter_go_mod(candidate, deps), "go mod tidy"
        if filename == "pom.xml":
            return filename, _filter_pom_xml(candidate, deps), "mvn install"
        if filename == "Cargo.toml":
            return filename, _filter_cargo_toml(candidate, deps), "cargo build"
    return None, None, None


def _generate_bundle_readme(
    repo_name: str,
    github_url: str,
    feature_slug: str,
    explanation: str,
    env_vars: list[str],
    install_command: str | None,
) -> str:
    env_block = "\n".join(f"- `{name}`" for name in env_vars) or "- None detected"
    install_line = install_command or "Install dependencies using the included manifest if needed."
    return (
        f"# Graft Feature Bundle\n\n"
        f"## Feature\n\n"
        f"This bundle contains the `{feature_slug}` feature extracted from `{repo_name}`.\n\n"
        f"## What It Does\n\n"
        f"{explanation}\n\n"
        f"## How The Files Connect\n\n"
        f"{explanation}\n\n"
        f"## Environment Variables\n\n"
        f"{env_block}\n\n"
        f"## Install Dependencies\n\n"
        f"Run `{install_line}`.\n\n"
        f"## Source Credit\n\n"
        f"Extracted from {github_url}.\n"
    )


def _write_bundle(
    output_path: Path,
    repo_root: Path,
    call_chain: list[Any],
    dependency_filename: str | None,
    dependency_content: str | None,
    bundle_readme: str,
    env_vars: list[str],
) -> None:
    temp_dir = output_path.parent / output_path.stem
    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)
    temp_dir.mkdir(parents=True, exist_ok=True)

    grouped_ranges: dict[str, list[tuple[int, int]]] = {}
    for item in call_chain:
        grouped_ranges.setdefault(item.file, []).append((item.line_start, item.line_end))

    for relative_path, ranges in grouped_ranges.items():
        target_path = temp_dir / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(_slice_file(repo_root, relative_path, ranges), encoding="utf-8")

    if dependency_filename and dependency_content is not None:
        (temp_dir / dependency_filename).write_text(dependency_content, encoding="utf-8")

    (temp_dir / "GRAFT_README.md").write_text(bundle_readme, encoding="utf-8")
    env_lines = "\n".join(f"{name}=CHANGE_ME" for name in env_vars).strip()
    (temp_dir / ".env.example").write_text((env_lines + "\n") if env_lines else "", encoding="utf-8")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in temp_dir.rglob("*"):
            if file_path.is_file():
                archive.write(file_path, file_path.relative_to(temp_dir))

    shutil.rmtree(temp_dir, ignore_errors=True)


async def create_bundle(request: BundleRequest, session_store: SessionStore) -> BundleResult:
    session = await session_store.get_session(request.session_id)
    if session is None:
        raise AppError("session_not_found", f"Session '{request.session_id}' does not exist.", 404)

    trace = session.traces.get(request.feature_slug)
    if trace is None:
        raise AppError(
            "trace_required",
            f"Feature '{request.feature_slug}' must be traced before a bundle can be generated.",
            400,
        )

    dependency_filename, dependency_content, install_command = _filter_dependency_file(
        session.clone_path,
        set(trace.third_party_deps),
    )
    bundle_readme = _generate_bundle_readme(
        session.repo_name,
        session.github_url,
        request.feature_slug,
        trace.explanation,
        trace.env_vars,
        install_command,
    )

    output_path = GRAFT_BUNDLES_ROOT / f"{request.session_id}_{request.feature_slug}.zip"
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None,
        _write_bundle,
        output_path,
        session.clone_path,
        trace.call_chain,
        dependency_filename,
        dependency_content,
        bundle_readme,
        trace.env_vars,
    )
    return BundleResult(
        path=output_path,
        download_name=f"graft_{session.repo_name}_{request.feature_slug}.zip",
    )
