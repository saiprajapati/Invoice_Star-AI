from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Invoice Extraction AI"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_BUCKET: str = "invoices"

    # LLM
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"  # "openai" or "gemini"
    LLM_MODEL: str = "gpt-4o-mini"

    # OCR
    OCR_PROVIDER: str = "tesseract"  # "tesseract" or "google_vision"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
