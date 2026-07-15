from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import db 
from app.api.v1.endpoints import transactions, auth, budgets
app = FastAPI(title=settings.PROJECT_NAME)
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
if settings.FRONTEND_ORIGIN:
    origins.extend([o.strip() for o in settings.FRONTEND_ORIGIN.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
@app.get("/")
def read_root():
    return {
        "message": "Finance Fusion API is Running",
        "docs_url": "http://127.0.0.1:8000/docs"
    }