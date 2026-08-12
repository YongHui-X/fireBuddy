import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services.rate_limiter import SlidingWindowRateLimiter


class SlidingWindowRateLimiterTests(unittest.TestCase):
    def test_blocks_after_limit_and_reports_retry_time(self):
        limiter = SlidingWindowRateLimiter(request_limit=2, window_seconds=60)

        self.assertTrue(limiter.check("user", now=100).allowed)
        self.assertTrue(limiter.check("user", now=110).allowed)
        decision = limiter.check("user", now=120)

        self.assertFalse(decision.allowed)
        self.assertEqual(decision.retry_after_seconds, 40)

    def test_expired_events_allow_a_new_request(self):
        limiter = SlidingWindowRateLimiter(request_limit=1, window_seconds=10)

        self.assertTrue(limiter.check("user", now=100).allowed)
        self.assertTrue(limiter.check("user", now=111).allowed)

    def test_limits_are_isolated_by_user(self):
        limiter = SlidingWindowRateLimiter(request_limit=1, window_seconds=60)

        self.assertTrue(limiter.check("first", now=100).allowed)
        self.assertTrue(limiter.check("second", now=100).allowed)


if __name__ == "__main__":
    unittest.main()
