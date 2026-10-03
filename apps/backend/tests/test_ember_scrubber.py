import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from schemas.rag import ChatMessage
from services.ember_masking import MaskingSession, UserNames


class EmberScrubberTests(unittest.TestCase):
    def test_scrub_question_restores_each_amount_spelling(self):
        session = MaskingSession(enabled=True)
        for amount in ("S$6,000", "SGD 2500", "$1.2k", "12,500", "15000"):
            with self.subTest(amount=amount):
                scrubbed = session.scrub_question(f"What about {amount}?")
                self.assertRegex(scrubbed, r"^What about \{\{Q\d+\}\}\?$")
                self.assertEqual(session.unmask(scrubbed), f"What about {amount}?")

    def test_scrub_question_keeps_dates_years_percentages_and_small_numbers(self):
        session = MaskingSession(enabled=True)
        question = "In 2026, from 2026-03-01 or 1/3/2026, is 4.5% on 3 or 500 enough?"
        self.assertEqual(session.scrub_question(question), question)

    def test_scrub_question_masks_account_and_position_names_case_insensitively(self):
        session = MaskingSession(UserNames(accounts=("Rainy Day",), positions=("Car loan",)), enabled=True)
        scrubbed = session.scrub_question("Move rainy day to CAR LOAN, then Car loan")

        self.assertRegex(scrubbed, r"^Move \{\{P\d+\}\} to \{\{P\d+\}\}, then \{\{P\d+\}\}$")
        self.assertNotIn("rainy day", scrubbed.lower())
        self.assertNotIn("car loan", scrubbed.lower())
        self.assertEqual(scrubbed.split(" to ")[1].split(",")[0], scrubbed.split("then ")[1])

    def test_scrub_question_keeps_stoplisted_and_short_names(self):
        session = MaskingSession(UserNames(accounts=("Cash", "UOB"), positions=("CPF",)), enabled=True)
        self.assertEqual(session.scrub_question("Cash, UOB and CPF"), "Cash, UOB and CPF")

    def test_custom_category_uses_same_token_in_question_and_facts(self):
        name = "Cat care"
        session = MaskingSession(UserNames(custom_categories=(name,)), enabled=True)
        question = session.scrub_question("How much did I spend on cat care?")
        fact = session.mask_facts({"category": name})["category"]

        self.assertRegex(fact, r"^\{\{C\d+\}\}$")
        self.assertIn(fact, question)
        self.assertEqual(session.unmask(question), "How much did I spend on Cat care?")

    def test_scrub_history_masks_both_roles(self):
        session = MaskingSession(UserNames(accounts=("Rainy Day",)), enabled=True)
        history = [
            ChatMessage(role="user", content="Rainy Day has S$6,000"),
            ChatMessage(role="assistant", content="Add SGD 2500 to Rainy Day"),
        ]
        scrubbed = session.scrub_history(history)

        self.assertEqual([message.role for message in scrubbed], ["user", "assistant"])
        for original, masked in zip(history, scrubbed):
            with self.subTest(role=original.role):
                self.assertRegex(masked.content, r"\{\{Q\d+\}\}")
                self.assertRegex(masked.content, r"\{\{P\d+\}\}")
                self.assertNotIn("Rainy Day", masked.content)
                self.assertEqual(session.unmask(masked.content), original.content)

    def test_retrieval_text_replaces_tokens_with_words(self):
        session = MaskingSession(UserNames(accounts=("Rainy Day",), custom_categories=("Cat care",)), enabled=True)
        scrubbed = session.scrub_question("Use S$6,000 from Rainy Day for Cat care")
        retrieval = session.retrieval_text(scrubbed)

        self.assertEqual(retrieval, "Use an amount from an account for a category")
        self.assertNotIn("{{", retrieval)


if __name__ == "__main__":
    unittest.main()
