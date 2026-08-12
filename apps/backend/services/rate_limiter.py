"""Small thread-safe rate limiter for authenticated advisor requests."""

from collections import defaultdict, deque
from dataclasses import dataclass
from math import ceil
from threading import Lock
from time import monotonic


@dataclass(frozen=True)
class RateLimitDecision:
    """Describe whether a request is allowed and when a blocked user can retry."""

    allowed: bool
    retry_after_seconds: int = 0


class SlidingWindowRateLimiter:
    """Limit each key to a fixed number of events in a rolling time window."""

    def __init__(self, request_limit: int, window_seconds: int) -> None:
        if request_limit <= 0 or window_seconds <= 0:
            raise ValueError("Rate-limit values must be positive")
        self.request_limit = request_limit
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, *, now: float | None = None) -> RateLimitDecision:
        """Record an allowed event or return its remaining wait time."""

        current_time = monotonic() if now is None else now
        cutoff = current_time - self.window_seconds

        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= self.request_limit:
                retry_after = max(1, ceil(events[0] + self.window_seconds - current_time))
                return RateLimitDecision(False, retry_after)

            events.append(current_time)
            return RateLimitDecision(True)

    def reset(self) -> None:
        """Clear tracked events, primarily for deterministic tests."""

        with self._lock:
            self._events.clear()
