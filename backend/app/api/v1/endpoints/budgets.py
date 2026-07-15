from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import budget as models
from app.schemas import budget as schemas
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[schemas.Budget])
def read_budgets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(models.Budget).filter(models.Budget.user_id == current_user.id).all()

@router.post("/", response_model=schemas.Budget)
def set_budget(
    budget_data: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_budget = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category == budget_data.category
    ).first()

    if existing_budget:
        existing_budget.amount = budget_data.amount
        db.commit()
        db.refresh(existing_budget)
        return existing_budget
    else:
        new_budget = models.Budget(**budget_data.model_dump(), user_id=current_user.id)
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return new_budget