from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from app.database import get_db
from app.schemas import user as user_schema

router = APIRouter()
bearer_scheme = HTTPBearer()

USERS = "users"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db=Depends(get_db),
):
    """
    Verifies the Firebase ID token sent by the frontend (from
    firebase.auth().currentUser.getIdToken()) and auto-provisions a
    matching Firestore profile document on first sight of this user.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        decoded = firebase_auth.verify_id_token(credentials.credentials)
    except Exception:
        raise credentials_exception

    uid = decoded.get("uid")
    if not uid:
        raise credentials_exception

    doc_ref = db.collection(USERS).document(uid)
    snap = doc_ref.get()

    if snap.exists:
        data = snap.to_dict()
    else:
        # First time we're seeing this Firebase user (email/password or
        # Google sign-in) — create their app-side profile doc.
        data = {
            "email": decoded.get("email"),
            "full_name": decoded.get("name"),
        }
        doc_ref.set(data)

    data["id"] = uid
    return data


@router.get("/me", response_model=user_schema.User)
def read_current_user(current_user: dict = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=user_schema.User)
def update_current_user(
    payload: user_schema.UserProfileUpdate,
    db=Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        db.collection(USERS).document(current_user["id"]).update(updates)
        current_user.update(updates)
    return current_user