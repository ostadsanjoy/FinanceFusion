from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))  # <--- NEW LINK
    amount = Column(Float, nullable=False)
    description = Column(String, index=True)
    category = Column(String, default="Uncategorized")
    source_type = Column(String, default="CASH")
    date = Column(DateTime, default=datetime.utcnow)
    is_expense = Column(Boolean, default=True)
    owner = relationship("User", back_populates="transactions")