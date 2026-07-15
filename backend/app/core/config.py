from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Finance Fusion"
    DATABASE_URL: str = "sqlite:///./finance.db"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    OTP_EXPIRE_MINUTES: int = 10
    MAX_OTP_ATTEMPTS: int = 5

    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "financefusion.cc@gmail.com"
    BREVO_SENDER_NAME: str = "Finance Fusion"
    FRONTEND_ORIGIN: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()