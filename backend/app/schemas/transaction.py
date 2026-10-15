from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class TransactionBase(BaseModel):
    amount: float
    description: str
    category: str = "Uncategorized"
    source_type: str = "CASH"
    is_expense: bool = True
    date: Optional[datetime] = None 

class TransactionCreate(TransactionBase):
    ref: Optional[str] = None
    items: Optional[List[dict]] = None


class BulkTransactions(BaseModel):
    transactions: List[TransactionCreate]

class Transaction(TransactionBase):
    id: str
    user_id: str
    date: datetime
    ref: Optional[str] = None
    items: Optional[List[dict]] = None

    class Config:
        from_attributes = True