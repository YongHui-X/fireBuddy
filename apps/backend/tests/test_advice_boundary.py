import unittest

from services.advice_boundary import ADVICE_BOUNDARY_ANSWER, is_personal_advice_request


ADVICE_REQUESTS = [
    "Should I buy Tesla stock?",
    "Which stock should I buy now with my savings?",
    "Should I put my emergency fund into crypto?",
    "Is DBS a good stock to buy right now?",
    "Which robo-advisor should I use, Syfe or StashAway?",
    "Should I put my savings in Singapore Savings Bonds or T-bills?",
    "I have {{M1}}, what exactly should I invest in?",
    "Should I sell my ETFs because the market is falling?",
    "Which insurance plan should I buy, AIA or Prudential?",
    "Should I take a personal loan to invest in stocks?",
    "Should I top up my CPF or buy the STI ETF instead?",
    "Tell me exactly how to allocate my portfolio across stocks and bonds.",
    "What is the best ETF to buy in Singapore?",
    "Based on my numbers, should I quit my job and retire early now?",
    "Is it a good time to buy gold?",
    "Can you recommend a broker for US shares?",
    "How should I split my savings between bonds and equities?",
    "Do you think it's wise for me to retire early with my numbers?",
    "Am I better off paying down my mortgage or investing the money?",
    "Would it be smart to move my savings into stocks?",
    "Is it better to top up CPF or invest in ETFs?",
]

GENERAL_QUESTIONS = [
    "How much have I spent this month, and which categories are highest?",
    "How long more to FIRE based on my current FireBuddy data?",
    "What are the CPF contribution rates for 2026, and how do they vary by age?",
    "How do the Basic, Full, and Enhanced Retirement Sums differ?",
    "How do Singapore Savings Bonds work, and what should I understand before applying?",
    "Is my emergency fund large enough compared with MoneySense guidance?",
    "Should I build an emergency fund first?",
    "How much should I save each month?",
    "Which categories should I cut back on?",
    "What should I compare between robo-advisors?",
    "What is an ETF?",
    "Is SSB safe?",
    "When can I retire?",
    "Should I be worried about my spending?",
    "How old must I be to buy Singapore Savings Bonds?",
    "How do Singapore Savings Bonds and T-bills differ?",
]


class AdviceBoundaryTests(unittest.TestCase):
    def test_declines_requests_for_personal_investment_decisions(self):
        for question in ADVICE_REQUESTS:
            with self.subTest(question=question):
                self.assertTrue(is_personal_advice_request(question))

    def test_lets_general_and_budgeting_questions_through(self):
        for question in GENERAL_QUESTIONS:
            with self.subTest(question=question):
                self.assertFalse(is_personal_advice_request(question))

    def test_reply_points_to_a_licensed_adviser(self):
        self.assertIn("licensed financial adviser", ADVICE_BOUNDARY_ANSWER)
        self.assertNotIn("{{", ADVICE_BOUNDARY_ANSWER)


if __name__ == "__main__":
    unittest.main()
