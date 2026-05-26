"""
Optional Telegram notifier for knowledge-base utility runs.

If Telegram environment variables are absent, this script logs and no-ops.
"""

import logging
import os
from typing import Any

try:
    import requests
except ModuleNotFoundError:
    requests = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)


def build_message(
    *,
    figure_changes: list[str] | None = None,
    pdf_changes: list[str] | None = None,
    pdf_failures: list[str] | None = None,
) -> str:
    figure_changes = figure_changes or []
    pdf_changes = pdf_changes or []
    pdf_failures = pdf_failures or []

    lines = [
        "FireBuddy knowledge-base utility run complete",
        f"PDF changes: {len(pdf_changes)}",
        f"Figure changes: {len(figure_changes)}",
        f"PDF failures: {len(pdf_failures)}",
        "Ingestion: skipped",
    ]

    if pdf_changes:
        lines.append("")
        lines.append("Changed PDFs:")
        lines.extend(f"- {item}" for item in pdf_changes)

    if figure_changes:
        lines.append("")
        lines.append("Figure changes:")
        lines.extend(f"- {item}" for item in figure_changes[:10])
        if len(figure_changes) > 10:
            lines.append(f"- ...and {len(figure_changes) - 10} more")

    if pdf_failures:
        lines.append("")
        lines.append("PDF failures:")
        lines.extend(f"- {item}" for item in pdf_failures)

    return "\n".join(lines)


def send_notification(
    *,
    figure_changes: list[str] | None = None,
    pdf_changes: list[str] | None = None,
    pdf_failures: list[str] | None = None,
) -> dict[str, Any]:
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")

    if not token or not chat_id:
        log.info("Telegram env vars not set; skipping notification.")
        return {"sent": False, "reason": "missing_env"}

    if requests is None:
        log.warning("Missing dependency: requests; skipping notification.")
        return {"sent": False, "reason": "missing_requests"}

    message = build_message(
        figure_changes=figure_changes,
        pdf_changes=pdf_changes,
        pdf_failures=pdf_failures,
    )
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    response = requests.post(
        url,
        json={"chat_id": chat_id, "text": message},
        timeout=30,
    )
    response.raise_for_status()
    log.info("Sent Telegram notification.")
    return {"sent": True}


if __name__ == "__main__":
    send_notification()
