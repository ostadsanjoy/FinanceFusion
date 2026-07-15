from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class User(UserBase):
    id: str

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None