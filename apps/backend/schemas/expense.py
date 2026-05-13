from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class CreateExpenseRequest(BaseModel):
    category_id: str | None = None #can be either str or null
    description: str
    amount: Decimal
    date: date
