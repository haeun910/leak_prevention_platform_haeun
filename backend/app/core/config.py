import os
from typing import List

import yaml
from pydantic_settings import BaseSettings


BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))


class Settings(BaseSettings):
    ALLOWED_ORIGINS: List[str] = ["*"]

    JWT_SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str = "sqlite:///./admin_logs.db"
    NER_MODEL_NAME: str = "monologg/koelectra-base-v3-naver-ner"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-latest"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = os.path.join(BACKEND_DIR, ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()


def load_policy() -> dict:
    config_path = os.path.join(BACKEND_DIR, "config.yaml")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}
