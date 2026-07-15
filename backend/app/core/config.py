from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Finance Fusion"
    API_V1_STR: str = "/api/v1"
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""
    FRONTEND_ORIGIN: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()