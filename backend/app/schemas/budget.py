from pydantic import BaseModel

class BudgetBase(BaseModel):
    category: str
    amount: float

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True