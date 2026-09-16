"""
Singapore finance acronym expansion for retrieval queries.

Users write "OA", "FRS" or "SSB"; the knowledge base mostly spells the full
term. Expanding acronyms before embedding and keyword search lets both signals
match without a second model call. The glossary mirrors the terms in AGENTS.md.
"""

import re


ACRONYM_GLOSSARY: dict[str, str] = {
    "CPF": "Central Provident Fund",
    "OA": "Ordinary Account",
    "SA": "Special Account",
    "MA": "MediSave Account",
    "RA": "Retirement Account",
    "BRS": "Basic Retirement Sum",
    "FRS": "Full Retirement Sum",
    "ERS": "Enhanced Retirement Sum",
    "CPFIS": "CPF Investment Scheme",
    "SRS": "Supplementary Retirement Scheme",
    "SSB": "Singapore Savings Bonds",
    "SGS": "Singapore Government Securities",
    "HDB": "Housing Development Board",
    "EHG": "Enhanced CPF Housing Grant",
    "OW": "Ordinary Wages",
    "AW": "Additional Wages",
    "IRAS": "Inland Revenue Authority of Singapore",
    "MAS": "Monetary Authority of Singapore",
    "YA": "Year of Assessment",
    "FIRE": "Financial Independence Retire Early",
    "SWR": "safe withdrawal rate",
    "ETF": "exchange traded fund",
    "REIT": "real estate investment trust",
    "CDP": "Central Depository",
    "PR": "Permanent Resident",
    "SPR": "Singapore Permanent Resident",
}

_ACRONYM_PATTERN = re.compile(
    r"\b(" + "|".join(sorted(ACRONYM_GLOSSARY, key=len, reverse=True)) + r")\b"
)


def expand_query_acronyms(text: str) -> str:
    """
    Append the full form after each acronym the first time it appears.

    "What is the FRS in 2026?" becomes
    "What is the FRS (Full Retirement Sum) in 2026?". Matching is case
    sensitive so ordinary words such as "sa" or "ma" are left alone, and an
    acronym whose expansion is already present nearby is not expanded twice.
    """

    if not text:
        return text

    seen: set[str] = set()
    lowered = text.lower()

    def replace(match: re.Match) -> str:
        acronym = match.group(1)
        expansion = ACRONYM_GLOSSARY[acronym]
        if acronym in seen or expansion.lower() in lowered:
            return acronym
        seen.add(acronym)
        return f"{acronym} ({expansion})"

    return _ACRONYM_PATTERN.sub(replace, text)
