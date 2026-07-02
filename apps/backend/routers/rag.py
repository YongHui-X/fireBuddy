from fastapi import APIRouter

from services.rag_service import answer_financial_advisor_question
from schemas.rag import AdvisorRequest, AdvisorResponse

router = APIRouter()


@router.post("/api/chat/financial-advisor", response_model=AdvisorResponse)
def financial_advisor(body: AdvisorRequest):
  return answer_financial_advisor_question(body.question, body.history)
