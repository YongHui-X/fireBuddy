"""
Masking layer between the user's figures and the answer model.

The model never receives an exact figure, a transaction description, or a name
the user typed. Each value in a trusted data block becomes a placeholder token
plus a coarse band ("{{M1}} (range: 25k-50k)"); amounts and names in the
question and history become tokens too. The model is told to copy tokens
verbatim, and the backend substitutes the real values back into the answer,
including across streamed deltas. One `MaskingSession` lives for one request.

Token kinds: M money, R rate or percentage, N month count, C user-created
category name, P account or wealth position name, Q an amount typed in the
question or history.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from decimal import ROUND_FLOOR, Decimal, InvalidOperation
from typing import Iterable

from lib.repository import fetch_all
from lib.supabase import supabase
from schemas.rag import ChatMessage


logger = logging.getLogger(__name__)

# Evaluation-only kill switch. Never set on a deployed server.
MASKING_MODE = (os.getenv("EMBER_MASKING_MODE", "on").strip().lower() or "on")
if MASKING_MODE == "off":  # pragma: no cover - configuration warning only
    logger.warning("EMBER_MASKING_MODE=off: exact user figures will reach the answer model")

TOKEN_RE = re.compile(r"\{\{\s*([MRNCPQ]\d+)\s*\}\}")
# The model sometimes echoes the band after the token; drop it so the restored
# figure does not read "S$31,200.00 (range: 25k-50k)".
TOKEN_WITH_BAND_RE = re.compile(r"\{\{\s*([MRNCPQ]\d+)\s*\}\}(?:\s*\((?:range|approx\.?|about)[^)]*\))?")
# Longest placeholder the stream un-masker will hold back while waiting for "}}".
MAX_TOKEN_LENGTH = 12
UNAVAILABLE = "[figure unavailable]"
# Masked JSON is longer than the raw block because of band text.
MAX_MASKED_CONTEXT_CHARS = 3600

MONEY_KEYS = {
    "netWorth", "liabilityTotal", "monthlyDebtService", "investableAssets",
    "averageMonthlyEssentialSpending", "income", "spending", "savingsAmount",
    "investedAmount", "debtService", "fiTarget", "requiredMonthlyInvestment",
    "total", "amount", "difference", "currentInvestableAssets", "projectedPortfolio",
    "fundingGap", "targetToday", "portfolioToday", "monthlySpending",
    "monthlyContribution", "cpfMonthlyPayout", "balance", "expenseTotal",
    "annualisedSpending", "emergencyFundTarget3Months", "emergencyFundTarget6Months",
    "totalMonthlyDebtService", "monthlyPayment", "originalPrincipal", "assetTotal",
    "gapFromTodayAssets", "lastMonthAmount",
}
RATIO_KEYS = {
    "savingsRate", "progressRate", "progressRateCapped", "projectedShareOfTargetAtRetirement",
    "progressToday", "share", "beforeReturn", "afterReturn", "inflation", "interestRate",
    "debtToIncome", "highestInterestRate",
}
PERCENT_KEYS = {"changePercent"}
MONTH_KEYS = {"emergencyRunwayMonths", "emergencyRunwayMonthsWithDebt", "estimatedMonths", "monthsRemaining"}
CATEGORY_KEYS = {"category"}
TEXT_KEYS = {"title", "rationale", "evidence", "explanation", "message", "limitations"}
PASSTHROUGH_KEYS = {
    "effectiveDate", "snapshotStatus", "period", "start", "end", "month", "fundingStatus",
    "status", "completeness", "savingsRateStatus", "warningCodes", "code", "kind", "label",
    "destination", "ruleId", "actionType", "calculationVersion", "estimatedFiYear",
    "earliestRetirementMonth", "retirementMonth", "endAge", "cpfStartAge", "cpfPlan",
    "provenance", "recordCount", "completedMonths", "evidencePeriod", "startDate", "endDate",
    "figure", "year", "value", "unit", "availableYears", "sourceTitle", "payoffMonth", "direction",
}
NUMERIC_RE = re.compile(r"^-?\d+(?:\.\d+)?$")

# Band clean-up after restoring, kept in step with packages/shared/src/masking.ts. Bands are for
# the model only, so any wording that repeats one ("which falls within the range of 50k-100k")
# is removed while real guidance such as "3-6 months of expenses" stays.
MONEY_BAND = r"(?:under 1k|over 1M|\d+k\s*(?:-|–|—|to)\s*\d+(?:k|M))"
BAND_LEAD = r",?\s*(?:(?:which|and|this|that|it)\s+)*"
STRAY_BAND_RE = re.compile(r"\s*\(range:[^)]*\)", re.I)
STRAY_MONEY_BAND_RE = re.compile(rf"\s*\({MONEY_BAND}\)", re.I)
BAND_CLAUSE_RE = re.compile(rf"{BAND_LEAD}(?:falls|sits|lies|is)?\s*(?:with)?in\s+(?:the\s+|a\s+)?range\s+of\s+{MONEY_BAND}", re.I)
BRACKET_CLAUSE_RE = re.compile(rf"{BAND_LEAD}(?:falls|sits|lies|is)?\s*(?:with)?in\s+the\s+{MONEY_BAND}\s+(?:bracket|band|range)", re.I)
BETWEEN_CLAUSE_RE = re.compile(rf"{BAND_LEAD}(?:falls|sits|lies|is)\s+(?:somewhere\s+)?between\s+\d+k\s+and\s+\d+(?:k|M)", re.I)
PERCENT_BAND_CLAUSE_RE = re.compile(r",?\s*which\s+(?:is|falls|sits)\s+(?:with)?in\s+(?:the\s+)?range\s+of\s+\d+\s*-\s*\d+%", re.I)
MONTHS_BAND_CLAUSE_RE = re.compile(r",?\s*which\s+is\s+(?:over 12 months|(?:with)?in\s+the\s+(?:range\s+of\s+)?(?:0-1|1-3|3-6|6-12) months(?:\s+range)?)", re.I)
REPRESENTED_BY_RE = re.compile(r"\b(?:is\s+)?represented\s+by\s+(?:the\s+)?(?:placeholder\s+|[a-z]+[A-Z][A-Za-z]*\s+(?:ratio\s+|figure\s+|value\s+)?(?:of\s+)?)?(?=S\$|\$|\d)")
BAND_PHRASE_RE = re.compile(rf",?\s*(?:(?:and|with|but)\s+)?(?:(?:the|a|its|your)\s+)?range\s+(?:is|of|being)?\s*{MONEY_BAND}", re.I)
REAL_FIGURE_RE = re.compile(r"S\$\s?\d|\d(?:\.\d+)?%|\d(?:\.\d+)? months")
BAND_SENTENCE_RE = re.compile(rf"[^.\n]*\brange\b[^.\n]{{0,40}}\b{MONEY_BAND}\b[^.\n]*\.?", re.I)
FIGURE_BAND_RE = re.compile(r"(\d(?:\.\d+)? months|\d(?:\.\d+)?%)\s*\((?:0-1 months|1-3 months|3-6 months|6-12 months|over 12 months|\d+-\d+%|over 100%)\)", re.I)
EMPTY_BULLET_RE = re.compile(r"^[ \t]*-[ \t]*(?:(?:this|that|it)(?:[ \t]+(?:total|figure|amount|value|number))?)?[ \t]*[.,;:]?[ \t]*(?:\r?\n|$)", re.I | re.M)
# A sentence still being streamed that may be turning into band wording, held back until it ends.
BAND_HINT_RE = re.compile(r"\b(?:range|between|bracket|band|which|falls|sits|lies|within)\b", re.I)
# A sentence ending mid-word ("…within the ra") is held too when the word could become a hint.
BAND_HINT_WORDS = ("range", "between", "bracket", "band", "which", "falls", "within")
MAX_HELD_SENTENCE = 240


def _strip_band_sentence(match: re.Match[str]) -> str:
    """Keep a sentence that states a real figure, minus its range wording; drop one that is only a range."""

    sentence = match.group(0)
    return BAND_PHRASE_RE.sub("", sentence) if REAL_FIGURE_RE.search(sentence) else ""


def strip_bands(text: str) -> str:
    """Remove any band wording the model echoed into an answer whose tokens are already restored."""

    text = STRAY_BAND_RE.sub("", text)
    text = STRAY_MONEY_BAND_RE.sub("", text)
    text = BAND_CLAUSE_RE.sub("", text)
    text = BRACKET_CLAUSE_RE.sub("", text)
    text = BETWEEN_CLAUSE_RE.sub("", text)
    text = PERCENT_BAND_CLAUSE_RE.sub("", text)
    text = MONTHS_BAND_CLAUSE_RE.sub("", text)
    text = REPRESENTED_BY_RE.sub("is ", text)
    text = BAND_SENTENCE_RE.sub(_strip_band_sentence, text)
    text = FIGURE_BAND_RE.sub(r"\1", text)
    text = EMPTY_BULLET_RE.sub("", text)
    return re.sub(r"(\d months) months\b", r"\1", text)

# Scrubber patterns for free text typed by the user.
CURRENCY_RE = re.compile(r"(?:S\$|SGD\s?|\$)\s?-?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM]\b)?")
THOUSANDS_RE = re.compile(r"(?<![\d{\w])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d%\w])")
BARE_NUMBER_RE = re.compile(r"(?<![\d{\w/.-])\d{4,}(?:\.\d+)?(?![\d%\w/.-])")
PERCENT_RE = re.compile(r"(?<![\w{])-?\d+(?:\.\d+)?\s?%")
AMOUNT_IN_TEXT_RE = re.compile(r"S\$\s?-?\d[\d,]*(?:\.\d+)?")

NAME_STOPLIST = {"cash", "bank", "savings", "cpf", "investments", "loan", "mortgage", "others", "other", "home", "car", "salary"}
MIN_NAME_LENGTH = 4


def _decimal(value: object) -> Decimal | None:
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def _is_year(text: str) -> bool:
    return len(text) == 4 and text.isdigit() and 1900 <= int(text) <= 2100


def money_band(value: Decimal) -> str:
    """Coarse size of an amount, enough for 'is this large or small' reasoning."""

    magnitude = abs(value)
    if magnitude == 0:
        return "zero"
    edges = (
        (Decimal("1000"), "under 1k"), (Decimal("5000"), "1k-5k"), (Decimal("10000"), "5k-10k"),
        (Decimal("25000"), "10k-25k"), (Decimal("50000"), "25k-50k"), (Decimal("100000"), "50k-100k"),
        (Decimal("250000"), "100k-250k"), (Decimal("500000"), "250k-500k"), (Decimal("1000000"), "500k-1M"),
    )
    band = "over 1M"
    for edge, label in edges:
        if magnitude < edge:
            band = label
            break
    return f"negative, {band}" if value < 0 else band


def percent_band(percent: Decimal) -> str:
    """Ten-point band for a percentage value such as 48.7."""

    low = (percent / 10).to_integral_value(rounding=ROUND_FLOOR) * 10
    if percent < 0:
        return f"{int(low)} to {int(low + 10)}%"
    if percent > 100:
        return "over 100%"
    if low == 100:
        low = Decimal("90")
    return f"{int(low)}-{int(low + 10)}%"


def months_band(months: Decimal) -> str:
    if months < 1:
        return "0-1 months"
    if months < 3:
        return "1-3 months"
    if months < 6:
        return "3-6 months"
    if months < 12:
        return "6-12 months"
    return "over 12 months"


def format_money(value: Decimal) -> str:
    sign = "-" if value < 0 else ""
    return f"{sign}S${abs(value):,.2f}"


@dataclass(frozen=True)
class UserNames:
    """Names the user typed that must never reach the model in clear."""

    accounts: tuple[str, ...] = ()
    positions: tuple[str, ...] = ()
    custom_categories: tuple[str, ...] = ()


def load_user_names(user_id: str) -> UserNames:
    """Load the caller's account, position and custom category names; empty on any failure."""

    if not user_id:
        return UserNames()
    try:
        accounts = fetch_all(lambda: supabase.table("accounts").select("name").eq("user_id", user_id).order("id"))
        positions = fetch_all(lambda: supabase.table("wealth_positions").select("name").eq("user_id", user_id).order("id"))
        categories = fetch_all(lambda: supabase.table("categories").select("name").eq("user_id", user_id).order("id"))
    except Exception:
        logger.exception("ember_user_names_unavailable")
        return UserNames()
    pick = lambda rows: tuple(str(row["name"]) for row in rows if row.get("name"))  # noqa: E731
    return UserNames(accounts=pick(accounts), positions=pick(positions), custom_categories=pick(categories))


class MaskingSession:
    """Token map for one request. Deterministic: the same value always gets the same token."""

    def __init__(self, names: UserNames | None = None, *, enabled: bool | None = None):
        self.enabled = (MASKING_MODE != "off") if enabled is None else enabled
        self._tokens: dict[tuple[str, str], str] = {}
        self._values: dict[str, str] = {}
        self._counters: dict[str, int] = {}
        names = names or UserNames()
        self._category_names = {name.casefold(): name for name in names.custom_categories}
        protected = [
            (name, "P") for name in (*names.accounts, *names.positions)
        ] + [(name, "C") for name in names.custom_categories]
        self._name_patterns: list[tuple[re.Pattern[str], str, str]] = []
        for name, kind in sorted(protected, key=lambda item: -len(item[0])):
            cleaned = name.strip()
            if len(cleaned) < MIN_NAME_LENGTH or cleaned.casefold() in NAME_STOPLIST:
                continue
            self._name_patterns.append((re.compile(rf"(?<!\w){re.escape(cleaned)}(?!\w)", re.IGNORECASE), kind, cleaned))

    # -- tokens -------------------------------------------------------------------

    def token_for(self, kind: str, value: str) -> str:
        key = (kind, value)
        token = self._tokens.get(key)
        if token is None:
            self._counters[kind] = self._counters.get(kind, 0) + 1
            token = f"{{{{{kind}{self._counters[kind]}}}}}"
            self._tokens[key] = token
            self._values[f"{kind}{self._counters[kind]}"] = value
        return token

    def _money_token(self, raw: str) -> str:
        value = _decimal(raw)
        if value is None:
            return self.mask_text(raw)
        return f"{self.token_for('M', format_money(value))} (range: {money_band(value)})"

    def _ratio_token(self, raw: str) -> str:
        value = _decimal(raw)
        if value is None:
            return self.mask_text(raw)
        percent = value * 100
        return f"{self.token_for('R', f'{percent.quantize(Decimal(chr(48) + chr(46) + chr(49)))}%')} (range: {percent_band(percent)})"

    def _percent_token(self, raw: str) -> str:
        value = _decimal(raw)
        if value is None:
            return self.mask_text(raw)
        return f"{self.token_for('R', f'{value.quantize(Decimal(chr(48) + chr(46) + chr(49)))}%')} (range: {percent_band(value)})"

    def _months_token(self, raw: str) -> str:
        value = _decimal(raw)
        if value is None:
            return self.mask_text(raw)
        return f"{self.token_for('N', f'{value.quantize(Decimal(chr(48) + chr(46) + chr(49)))} months')} (range: {months_band(value)})"

    def _category_token(self, raw: str) -> str:
        real = self._category_names.get(raw.casefold())
        return self.token_for("C", real) if real else raw

    # -- facts --------------------------------------------------------------------

    def mask_facts(self, facts: dict) -> dict:
        """Return a masked copy of a trusted data block. Unknown numeric strings are masked as money."""

        if not self.enabled:
            return facts
        return self._mask_value(None, facts)

    def _mask_value(self, key: str | None, value: object) -> object:
        if isinstance(value, dict):
            return {child: self._mask_value(child, item) for child, item in value.items()}
        if isinstance(value, list):
            return [self._mask_value(key, item) for item in value]
        if not isinstance(value, str):
            return value
        if key in PASSTHROUGH_KEYS:
            return value
        if key in MONEY_KEYS:
            return self._money_token(value)
        if key in RATIO_KEYS:
            return self._ratio_token(value)
        if key in PERCENT_KEYS:
            return self._percent_token(value)
        if key in MONTH_KEYS:
            return self._months_token(value)
        if key in CATEGORY_KEYS:
            return self._category_token(value)
        if key in TEXT_KEYS:
            return self.mask_text(value)
        if NUMERIC_RE.match(value):
            return self._money_token(value)
        return self.mask_text(value)

    # -- free text ----------------------------------------------------------------

    def mask_text(self, text: str) -> str:
        """Mask S$ amounts, percentages and registered names inside a sentence."""

        if not self.enabled or not text:
            return text

        def amount(match: re.Match[str]) -> str:
            value = _decimal(match.group(0).replace("S$", "").replace(",", "").replace(" ", ""))
            if value is None:
                return match.group(0)
            return f"{self.token_for('M', format_money(value))} (range: {money_band(value)})"

        def percent(match: re.Match[str]) -> str:
            value = _decimal(match.group(0).replace("%", "").strip())
            if value is None:
                return match.group(0)
            return f"{self.token_for('R', f'{value}%')} (range: {percent_band(value)})"

        masked = AMOUNT_IN_TEXT_RE.sub(amount, text)
        masked = PERCENT_RE.sub(percent, masked)
        return self._mask_names(masked)

    def _mask_names(self, text: str) -> str:
        for pattern, kind, real in self._name_patterns:
            text = pattern.sub(lambda _match, kind=kind, real=real: self.token_for(kind, real), text)
        return text

    def scrub_question(self, text: str) -> str:
        """Replace amounts and the user's own names in typed text; keep years, dates, percentages and default categories."""

        if not self.enabled or not text:
            return text

        def quantity(match: re.Match[str]) -> str:
            raw = match.group(0)
            if _is_year(raw):
                return raw
            return self.token_for("Q", raw)

        scrubbed = CURRENCY_RE.sub(quantity, text)
        scrubbed = THOUSANDS_RE.sub(quantity, scrubbed)
        scrubbed = BARE_NUMBER_RE.sub(quantity, scrubbed)
        return self._mask_names(scrubbed)

    def scrub_history(self, history: Iterable[ChatMessage]) -> list[ChatMessage]:
        """Scrub both roles: earlier answers stored by the client hold real figures."""

        return [
            message.model_copy(update={"content": self.scrub_question(message.content)})
            for message in history
        ]

    def retrieval_text(self, text: str | None) -> str | None:
        """Replace tokens with neutral words so the embedding sees ordinary language."""

        if not text:
            return text
        words = {"M": "an amount", "Q": "an amount", "R": "a rate", "N": "some months", "C": "a category", "P": "an account"}
        return TOKEN_RE.sub(lambda match: words.get(match.group(1)[0], "a value"), text)

    # -- restoring ----------------------------------------------------------------

    def unmask(self, text: str | None) -> str | None:
        """Put the real values back and drop echoed bands. An id the session never issued becomes a neutral marker."""

        if text is None:
            return None
        return strip_bands(TOKEN_WITH_BAND_RE.sub(lambda match: self._values.get(match.group(1), UNAVAILABLE), text))

    def unmasker(self) -> "StreamingUnmasker":
        return StreamingUnmasker(self)


class StreamingUnmasker:
    """Un-mask a token stream where a placeholder may be split across deltas."""

    def __init__(self, session: MaskingSession):
        self.session = session
        self.buffer = ""

    def feed(self, delta: str) -> str:
        self.buffer += delta
        text = self.buffer
        index = text.rfind("{")
        if index > 0 and text[index - 1] == "{":
            index -= 1
        if index != -1 and "}}" not in text[index:] and len(text) - index <= MAX_TOKEN_LENGTH + 2:
            emit, self.buffer = text[:index], text[index:]
        else:
            emit, self.buffer = text, ""
        # An unfinished sentence that mentions a range, an open bracket or a fresh bullet waits for
        # its end, so the band clean-up sees it whole rather than in pieces.
        start = max(emit.rfind(". "), emit.rfind("\n")) + 1
        tail = emit[start:]
        open_bracket = tail.rfind("(") != -1 and ")" not in tail[tail.rfind("("):]
        last_word = tail.split()[-1].lower() if tail.strip() and not tail[-1].isspace() else ""
        hint_starting = bool(last_word) and any(word.startswith(last_word) for word in BAND_HINT_WORDS)
        if len(tail) <= MAX_HELD_SENTENCE and (BAND_HINT_RE.search(tail) or hint_starting or open_bracket or tail.lstrip(" \t").startswith("-")):
            emit, self.buffer = emit[:start], tail + self.buffer
        return self.session.unmask(emit) or ""

    def flush(self) -> str:
        remainder, self.buffer = self.buffer, ""
        return self.session.unmask(remainder) or ""
