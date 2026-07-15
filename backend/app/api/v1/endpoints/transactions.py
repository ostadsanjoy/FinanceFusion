from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter

from app.database import get_db
from app.schemas import transaction as schemas
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

TRANSACTIONS = "transactions"


@router.post("/", response_model=schemas.Transaction)
def create_transaction(
    transaction: schemas.TransactionCreate,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    data = transaction.model_dump()
    data["date"] = data["date"] or datetime.utcnow()
    data["user_id"] = current_user["id"]

    _, doc_ref = db.collection(TRANSACTIONS).add(data)
    data["id"] = doc_ref.id
    return data


@router.get("/", response_model=List[schemas.Transaction])
def read_transactions(
    skip: int = 0,
    limit: int = 1000,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = (
        db.collection(TRANSACTIONS)
        .where(filter=FieldFilter("user_id", "==", current_user["id"]))
        .offset(skip)
        .limit(limit)
    )
    results = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    return results


@router.put("/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(
    transaction_id: str,
    transaction_update: schemas.TransactionCreate,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc_ref = db.collection(TRANSACTIONS).document(transaction_id)
    snap = doc_ref.get()
    if not snap.exists or snap.to_dict().get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = transaction_update.model_dump()
    if update_data["date"] is None:
        update_data["date"] = snap.to_dict().get("date")

    doc_ref.update(update_data)
    data = doc_ref.get().to_dict()
    data["id"] = doc_ref.id
    return data


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: str,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc_ref = db.collection(TRANSACTIONS).document(transaction_id)
    snap = doc_ref.get()
    if not snap.exists or snap.to_dict().get("user_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Transaction not found")

    doc_ref.delete()
    return {"message": "Transaction deleted"}