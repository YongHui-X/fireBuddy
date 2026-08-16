"""Store RAG evaluation reports as immutable, numbered versions."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


VERSION_FILE_PATTERN = re.compile(r"^v(?P<version>\d+)\.json$")
SUITE_TITLES = {
    "retrieval": "Retrieval evaluations",
    "answer": "Answer-quality evaluations",
}


@dataclass(frozen=True)
class VersionedReportPaths:
    """Identifies one immutable report version and its persisted artifacts."""

    version: int
    json_path: Path
    markdown_path: Path
    history_index_path: Path


def list_report_versions(results_directory: Path, suite: str) -> tuple[int, ...]:
    """Return all JSON-backed report versions recorded for one suite."""

    versions_directory = results_directory / suite / "versions"
    if not versions_directory.exists():
        return ()

    versions = []
    for path in versions_directory.iterdir():
        match = VERSION_FILE_PATTERN.match(path.name)
        if path.is_file() and match:
            versions.append(int(match.group("version")))
    return tuple(sorted(versions))


def _write_new_file(path: Path, content: str) -> None:
    """Create an immutable artifact and fail if that version already exists."""

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8", newline="\n") as output:
        output.write(content)


def _versioned_markdown(markdown: str, version: int, label: str) -> str:
    """Add visible version metadata below the report title."""

    title, separator, remainder = markdown.partition("\n")
    banner = f"> Report version: **Version {version}**\n> Run label: **{label}**"
    if not separator:
        return f"{title}\n\n{banner}\n"
    return f"{title}\n\n{banner}\n\n{remainder.lstrip()}"


def _report_summary_lines(suite: str, report: dict) -> list[str]:
    """Render compact metrics for one version in the shared history index."""

    lines = [
        f"Generated: `{report.get('generated_at', 'unknown')}`",
        f"Cases: **{report.get('case_count', 0)}**",
        "",
        "| Metric | Score |",
        "|---|---:|",
    ]
    metrics = report.get("metrics", {}) if suite == "retrieval" else report.get("summary", {})
    lines.extend(
        f"| {name} | {float(value):.4f} |"
        for name, value in metrics.items()
        if isinstance(value, (int, float))
    )
    return lines


def render_history_index(results_directory: Path) -> str:
    """Build a readable index with a separate section for every saved version."""

    lines = [
        "# FireBuddy RAG evaluation history",
        "",
        "Major test runs are stored as immutable numbered artifacts. The `*_latest` files are convenience copies of the newest version and are not the historical record.",
    ]
    for suite, title in SUITE_TITLES.items():
        lines.extend(["", f"## {title}", ""])
        versions = list_report_versions(results_directory, suite)
        if not versions:
            lines.append("No versions recorded yet.")
            continue

        for version in versions:
            stem = f"v{version:03d}"
            json_path = results_directory / suite / "versions" / f"{stem}.json"
            report = json.loads(json_path.read_text(encoding="utf-8"))
            label = str(report.get("report_label", "Major evaluation run"))
            lines.extend(
                [
                    f"### Version {version}: {label}",
                    "",
                    *_report_summary_lines(suite, report),
                    "",
                    f"Artifacts: [Markdown]({suite}/versions/{stem}.md) | [JSON]({suite}/versions/{stem}.json)",
                    "",
                ]
            )
    return "\n".join(lines).rstrip() + "\n"


def save_versioned_report(
    *,
    suite: str,
    report: dict,
    markdown: str,
    results_directory: Path,
    latest_json_path: Path,
    latest_markdown_path: Path,
    run_label: str,
) -> VersionedReportPaths:
    """Save the next immutable version, then refresh latest copies and the index."""

    if suite not in SUITE_TITLES:
        raise ValueError(f"Unsupported evaluation suite: {suite}")

    versions = list_report_versions(results_directory, suite)
    version = versions[-1] + 1 if versions else 1
    version_stem = f"v{version:03d}"
    versions_directory = results_directory / suite / "versions"
    version_json_path = versions_directory / f"{version_stem}.json"
    version_markdown_path = versions_directory / f"{version_stem}.md"

    existing_paths = [
        path for path in (version_json_path, version_markdown_path) if path.exists()
    ]
    if existing_paths:
        raise FileExistsError(
            "Refusing to overwrite existing report artifact(s): "
            + ", ".join(str(path) for path in existing_paths)
        )

    versioned_report = dict(report)
    versioned_report["report_version"] = version
    versioned_report["report_label"] = run_label.strip() or "Major evaluation run"
    json_content = json.dumps(versioned_report, indent=2) + "\n"
    markdown_content = _versioned_markdown(
        markdown,
        version,
        versioned_report["report_label"],
    )

    _write_new_file(version_json_path, json_content)
    _write_new_file(version_markdown_path, markdown_content)

    latest_json_path.parent.mkdir(parents=True, exist_ok=True)
    latest_markdown_path.parent.mkdir(parents=True, exist_ok=True)
    latest_json_path.write_text(json_content, encoding="utf-8", newline="\n")
    latest_markdown_path.write_text(markdown_content, encoding="utf-8", newline="\n")

    history_index_path = results_directory / "README.md"
    history_index_path.write_text(
        render_history_index(results_directory),
        encoding="utf-8",
        newline="\n",
    )
    return VersionedReportPaths(
        version=version,
        json_path=version_json_path,
        markdown_path=version_markdown_path,
        history_index_path=history_index_path,
    )
