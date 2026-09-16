"""
Exact-figure lookup for Ember.

Rates, sums and caps are the highest-stakes questions in a finance app, and
retrieving a table chunk and asking the chat model to read it is a lossy path.
This tool answers "what is X in year Y" from the curated
`rag/annual-figures.json` file with a deterministic sentence and a citation to
the knowledge-base document the figure was taken from. Retrieval remains the
fallback when the planner cannot map a question to a known figure key.
"""

import json
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Literal

from schemas.rag import AdvisorSource


FIGURES_PATH = Path(__file__).resolve().parents[1] / "rag" / "annual-figures.json"

FigureKey = Literal[
    "cpf_basic_retirement_sum",
    "cpf_full_retirement_sum",
    "cpf_enhanced_retirement_sum",
    "cpf_ordinary_wage_ceiling",
    "cpf_contribution_rates",
    "cpf_allocation_rates",
    "srs_annual_contribution_cap",
    "iras_personal_relief_cap",
    "ssb_individual_holding_limit",
    "cpfis_protected_balances",
]
FIGURE_KEYS: tuple[str, ...] = FigureKey.__args__  # type: ignore[attr-defined]


class FigureNotFoundError(LookupError):
    """Raised when the requested figure key or year is not in the curated file."""


@lru_cache(maxsize=1)
def load_figures(path: Path = FIGURES_PATH) -> dict:
    """Load and validate the curated figures file once per process."""

    data = json.loads(path.read_text(encoding="utf-8"))
    figures = data.get("figures")
    if not isinstance(figures, dict) or not figures:
        raise RuntimeError("annual-figures.json has no figures")
    for key, figure in figures.items():
        for field in ("label", "unit", "source_path", "values"):
            if field not in figure:
                raise RuntimeError(f"Figure {key} is missing required field {field}")
        if not isinstance(figure["values"], dict) or not figure["values"]:
            raise RuntimeError(f"Figure {key} has no values")
        for year in figure["values"]:
            if not year.isdigit():
                raise RuntimeError(f"Figure {key} has a non-numeric year key {year}")
    return data


def _money(value: float | int) -> str:
    if isinstance(value, float) and not value.is_integer():
        return f"S${value:,.2f}"
    return f"S${int(value):,}"


def _format_value(value, unit: str) -> str:
    """Render a scalar or one nested table as a readable sentence fragment."""

    if isinstance(value, dict):
        parts = []
        for name, inner in value.items():
            if isinstance(inner, dict):
                inner_text = ", ".join(
                    f"{inner_name} {_format_value(inner_value, unit)}"
                    for inner_name, inner_value in inner.items()
                )
                parts.append(f"{name}: {inner_text}")
            else:
                parts.append(f"{name} {_format_value(inner, unit)}")
        return "; ".join(parts)
    if unit == "SGD":
        return _money(value)
    if unit == "percent of wages":
        return f"{value:g}%"
    if unit == "ratio of contribution":
        return f"{value:.4f} ({value * 100:.2f}%)"
    return f"{value}"


def resolve_year(figure: dict, year: int | None, today: date) -> tuple[str, bool]:
    """
    Pick the year to answer for.

    Returns the chosen year key and whether it exactly matches the request.
    A missing year resolves to the current year when available, otherwise the
    latest year listed. A requested year that is not listed raises.
    """

    values = figure["values"]
    years = sorted(values, key=int)
    if year is None:
        current = str(today.year)
        return (current if current in values else years[-1]), True
    key = str(year)
    if key in values:
        return key, True
    raise FigureNotFoundError(
        f"{figure['label']} is only recorded for {years[0]} to {years[-1]}"
    )


def lookup_figure(figure_key: str, year: int | None, *, today: date | None = None) -> dict:
    """
    Return the exact figure, an explanatory sentence, and its citation.

    The response dictionary is safe to serialize into the answer context: it
    holds only public reference values, never user data.
    """

    data = load_figures()
    figure = data["figures"].get(figure_key)
    if figure is None:
        raise FigureNotFoundError(f"Unknown figure key: {figure_key}")

    current_date = today or date.today()
    resolved_year, _ = resolve_year(figure, year, current_date)
    value = figure["values"][resolved_year]
    rendered = _format_value(value, figure["unit"])

    if isinstance(value, dict):
        sentence = f"{figure['label']} for {resolved_year}: {rendered}."
    else:
        sentence = f"The {figure['label']} for {resolved_year} is {rendered}."
    if figure.get("applies_to"):
        sentence += f" This applies to the {figure['applies_to']}."
    sentence += f" Source: {figure.get('source_title') or figure['source_path']}."

    return {
        "figure_key": figure_key,
        "label": figure["label"],
        "year": int(resolved_year),
        "value": value,
        "unit": figure["unit"],
        "available_years": sorted(int(item) for item in figure["values"]),
        "exact_answer": sentence,
        "source": AdvisorSource(
            title=figure.get("source_title"),
            url=figure.get("source_url"),
            path=figure["source_path"],
            headline=figure["label"],
        ),
    }
