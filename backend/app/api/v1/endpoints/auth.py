from datetime import timedelta, datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.schemas import user as user_schema
from app.core import security
from app.core.config import settings
from app.core.email import send_otp_email

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = security.jwt.decode(token, security.settings.SECRET_KEY, algorithms=[security.settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except security.jwt.JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/signup", response_model=user_schema.User)
def create_user(user: user_schema.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = security.get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password, full_name=user.full_name)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=user_schema.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=security.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/forgot-password")
def forgot_password(payload: user_schema.ForgotPasswordRequest, db: Session = Depends(get_db)):
    generic_response = {"message": "If that email is registered, a code has been sent."}

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return generic_response

    otp = security.generate_otp()
    otp_hash = security.hash_otp(otp)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).update({"used": True})

    reset_entry = PasswordResetToken(user_id=user.id, otp_hash=otp_hash, expires_at=expires_at)
    db.add(reset_entry)
    db.commit()

    send_otp_email(user.email, otp)

    return generic_response

@router.post("/reset-password")
def reset_password(payload: user_schema.ResetPasswordRequest, db: Session = Depends(get_db)):
    generic_error = HTTPException(status_code=400, detail="Invalid or expired code")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise generic_error

    reset_entry = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used == False
    ).order_by(PasswordResetToken.id.desc()).first()

    if not reset_entry or reset_entry.expires_at < datetime.utcnow():
        raise generic_error

    if reset_entry.attempts >= settings.MAX_OTP_ATTEMPTS:
        reset_entry.used = True
        db.commit()
        raise generic_error

    if security.hash_otp(payload.otp) != reset_entry.otp_hash:
        reset_entry.attempts += 1
        db.commit()
        raise generic_error

    user.hashed_password = security.get_password_hash(payload.new_password)
    reset_entry.used = True
    db.commit()

    return {"message": "Password has been reset successfully"}