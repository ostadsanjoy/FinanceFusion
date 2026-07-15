import json

import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import settings


def _init_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        cred_info = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        cred = credentials.Certificate(cred_info)
    else:
        cred = credentials.ApplicationDefault()

    return firebase_admin.initialize_app(cred)


_init_firebase()
db = firestore.client()


def get_db():
    """FastAPI dependency — yields the shared Firestore client."""
    return db