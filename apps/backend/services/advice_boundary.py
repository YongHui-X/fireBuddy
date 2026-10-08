"""
Personal financial advice boundary for DouDou (owner, 8 Oct 2026).

FireBuddy is not licensed by MAS to give financial advice, so DouDou explains how things work
but never decides for the user: no buy, sell or hold calls, no product or provider picks, no
allocations, and no "quit your job now" verdicts. A clear request for one is answered with a
fixed reply before any planner, retrieval or OpenAI call, so it costs nothing and cannot be
talked round. Requests the screen misses are caught by ADVICE_BOUNDARY_GUIDANCE in the prompt.
"""

from __future__ import annotations

import re

ADVICE_BOUNDARY_ANSWER = (
    "I can't tell you whether to buy, sell or hold an investment, which product or provider "
    "to choose, how to split your money, or when to make a big move like retiring. That would "
    "be personal financial advice, which only a licensed financial adviser can give.\n\n"
    "What I can do is explain how things work so you can decide. For example, ask me "
    "\"How do Singapore Savings Bonds and T-bills differ?\", \"What should I compare between "
    "robo-advisors?\" or \"What does MoneySense say about emergency funds?\""
)

# The user asks for a decision: "should I…", "which … should I", "is X a good buy", "best … to buy".
_DECISION_CUE = re.compile(
    # "What should I compare / understand / look out for" asks to learn, not for a decision.
    r"\b(should|shall) (i|we)\b(?! (know|understand|compare|consider|look|learn|ask|check|read|note|be aware|keep in mind|think about))"
    r"|\bis (it|now) (a )?(good|wise|smart|right|bad) (idea|time|move|moment)\b"
    r"|\b(would|will) it be (a )?(good|wise|smart|better|sensible|bad)\b"
    r"|\b(do|would) you (think|say) (it'?s|it is|it would be|i should)\b"
    r"|\bis it (wise|smart|sensible|better)\b"
    r"|\b(am|are|would) (i|we) (be )?better off\b"
    r"|\bis [\w.&'-]+( [\w.&'-]+){0,2} (a )?(good|bad)\b"
    r"|\bwhat (exactly )?(should|do) (i|we) (invest|buy|put)\b"
    r"|\bwhich [\w -]{0,40}\b(to buy|to pick|to choose|to invest|to use)\b"
    r"|\bbest [\w -]{0,40}\b(to buy|to invest|stocks?|shares?|etfs?|funds?|robo[\w-]*|brokers?|insurance|polic(y|ies)|plans?|bonds?|crypto\w*)\b"
    r"|\btell me (exactly )?(how|what|where) to (allocate|invest|buy|put)\b"
    r"|\bhow (should|do) (i|we) (allocate|split|divide)\b"
    r"|\b(recommend|suggest) (me )?(a|an|some|which|what|the best)\b"
    r"|\bwhat (stock|stocks|shares|etf|etfs|fund|funds|crypto|coin|policy|insurance) (should|to)\b",
    re.IGNORECASE,
)

# …about an investment, product or big money move, not about budgeting or a guideline.
# "emergency fund" and "sinking fund" are savings goals, so they are removed before this check.
_INVESTMENT_OBJECT = re.compile(
    r"\b(buy|buying|sell|selling|hold|holding|invest\w*|allocat\w*|portfolio|stocks?|shares?|"
    r"equit(y|ies)|etfs?|unit trusts?|index funds?|mutual funds?|funds?|reits?|bonds?|t-?bills?|ssbs?|"
    r"crypto\w*|bitcoin|ethereum|gold|robo[\w-]*|syfe|stashaway|endowus|brokers?|brokerage|"
    r"insurance|insurer|polic(y|ies)|annuit(y|ies)|ilp|whole life|term life|"
    r"top ?up|cpfis|srs|loan to invest|borrow\w* to invest|leverage|margin|"
    r"quit (my|the) job|resign|retire (now|early|this year|next year)|"
    r"tesla|apple|nvidia|dbs|ocbc|uob|singtel|aia|prudential|great eastern|income insurance)\b",
    re.IGNORECASE,
)

_SAVINGS_GOALS = re.compile(r"\b(emergency|sinking|rainy[- ]day) funds?\b", re.IGNORECASE)


def is_personal_advice_request(question: str) -> bool:
    """True when the question asks DouDou to make an investment, product or big money decision."""

    text = " ".join(question.replace("’", "'").split())
    if not _DECISION_CUE.search(text):
        return False
    # Moving an emergency fund into an investment is still an investment decision; the goal
    # itself ("should I build an emergency fund?") is a guideline question.
    return bool(_INVESTMENT_OBJECT.search(_SAVINGS_GOALS.sub(" ", text)))


ADVICE_BOUNDARY_GUIDANCE = (
    "Never give personal financial advice: do not tell the user what they should or should "
    "not do with their money, and do not say an option is recommended, advisable, better for "
    "them, wise, sensible or not advisable. Do not give buy, sell, hold, switch, top-up, retire-now or "
    "quit-job verdicts, and do not pick a product, provider or allocation. Instead state what "
    "the curated guidelines say, what the user's records show against them, and the "
    "trade-offs to weigh, and leave the decision to the user. If the user asks you to decide, "
    "say in one sentence that you cannot give personal financial advice and that a licensed "
    "financial adviser can. "
)
