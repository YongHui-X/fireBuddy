"""
Compare the curated annual figures against the LLM-extracted ones.

`annual-figures.json` is hand-maintained and is what `figure_lookup` answers
from, so nothing automated ever corrects it. `fetch_figures.py` separately
extracts the same figures from the refreshed PDF caches into
`annual-figures.extracted.json`. Until now nothing compared the two, so an
agency could raise a ceiling and the curated file would keep serving the old
number indefinitely.

This compares only the figures that appear in both files. A mismatch is a
prompt to check the source and update the curated file by hand; it is never an
instruction to copy the extracted value, which comes from a model reading a
PDF and can itself be wrong.
"""

import argparse
import json
import sys
from pathlib import Path


RAG_DIR = Path(__file__).resolve().parents[1]
CURATED_PATH = RAG_DIR / "annual-figures.json"
EXTRACTED_PATH = RAG_DIR / "annual-figures.extracted.json"

# Extracted path -> curated figure key, and the label inside that figure's
# value for the year (None when the figure is a plain scalar). Extraction uses
# a flat document-shaped schema; the curated file is keyed by figure and year.
FIELD_MAP: list[tuple[tuple[str, ...], str, str | None]] = [
    (("cpf", "ordinary_wage_ceiling_monthly"), "cpf_ordinary_wage_ceiling", None),
    (("cpf", "retirement_sums", "brs"), "cpf_basic_retirement_sum", None),
    (("cpf", "retirement_sums", "frs"), "cpf_full_retirement_sum", None),
    (("cpf", "retirement_sums", "ers"), "cpf_enhanced_retirement_sum", None),
    (("cpf", "interest_rates", "OA"), "cpf_interest_rates", "Ordinary Account"),
    (("cpf", "interest_rates", "SA"), "cpf_interest_rates", "Special Account"),
    (("cpf", "interest_rates", "MA"), "cpf_interest_rates", "MediSave Account"),
    (("cpf", "interest_rates", "RA"), "cpf_interest_rates", "Retirement Account"),
    (
        ("srs", "contribution_cap_citizen_pr"),
        "srs_annual_contribution_cap",
        "Singapore Citizens and Permanent Residents",
    ),
    (
        ("srs", "contribution_cap_foreigner"),
        "srs_annual_contribution_cap",
        "Foreigners",
    ),
    (("income_tax", "personal_relief_cap"), "iras_personal_relief_cap", None),
    (
        ("income_tax", "cpf_cash_topup_relief_self_max"),
        "iras_cpf_cash_topup_relief_cap",
        "own account",
    ),
    (
        ("income_tax", "cpf_cash_topup_relief_family_max"),
        "iras_cpf_cash_topup_relief_cap",
        "family members",
    ),
]


def read_path(data: dict, path: tuple[str, ...]):
    """Walk a nested dictionary, returning None at the first missing step."""

    current = data
    for step in path:
        if not isinstance(current, dict) or step not in current:
            return None
        current = current[step]
    return current


def curated_value(figures: dict, key: str, label: str | None, year: str | None):
    """Read one curated figure for a year, defaulting to the latest recorded."""

    figure = figures.get(key)
    if not figure:
        return None, None

    values = figure["values"]
    chosen = year if year in values else max(values, key=int)
    value = values[chosen]
    if label is not None:
        value = value.get(label) if isinstance(value, dict) else None
    return value, chosen


def find_drift(curated: dict, extracted: dict) -> list[str]:
    """Return one readable line per figure whose two sources disagree."""

    figures = curated.get("figures", {})
    year = str(extracted["year"]) if extracted.get("year") else None
    sums_year = read_path(extracted, ("cpf", "retirement_sums", "year_applicable"))

    drift = []
    for path, key, label in FIELD_MAP:
        found = read_path(extracted, path)
        if found is None:
            continue

        applicable = str(sums_year) if "retirement_sums" in path and sums_year else year
        value, used_year = curated_value(figures, key, label, applicable)
        if value is None:
            continue

        if float(found) != float(value):
            dotted = ".".join(path)
            named = f"{key}[{used_year}]" + (f".{label}" if label else "")
            drift.append(f"{named}: curated {value!r}, extracted {found!r} (from {dotted})")
    return drift


def main(argv: list[str] | None = None) -> int:
    """Report curated-versus-extracted drift, exiting non-zero when any is found."""

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--curated", type=Path, default=CURATED_PATH)
    parser.add_argument("--extracted", type=Path, default=EXTRACTED_PATH)
    args = parser.parse_args(argv)

    if not args.extracted.exists():
        # fetch_figures.py has not run yet. That is not a drift failure.
        print(f"No extracted figures at {args.extracted}; nothing to compare.")
        return 0

    curated = json.loads(args.curated.read_text(encoding="utf-8"))
    extracted = json.loads(args.extracted.read_text(encoding="utf-8"))

    drift = find_drift(curated, extracted)
    if not drift:
        print("Curated annual figures agree with the extracted figures.")
        return 0

    print("Curated annual figures disagree with the extracted figures:")
    for line in drift:
        print(f"  {line}")
    print(
        "\nCheck the official source and update annual-figures.json by hand. "
        "Do not copy the extracted value; it comes from a model reading a PDF."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
