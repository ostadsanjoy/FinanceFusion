from pydantic import BaseModel

class BudgetBase(BaseModel):
    category: str
    amount: float

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: str
    user_id: str

    class Config:
        from_attributes = True