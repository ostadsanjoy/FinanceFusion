from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TransactionBase(BaseModel):
    amount: float
    description: str
    category: str = "Uncategorized"
    source_type: str = "CASH"
    is_expense: bool = True
    date: Optional[datetime] = None 

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    user_id: int
    date: datetime 

    class Config:
        from_attributes = True