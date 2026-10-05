from typing import List, Union
import json
import os

import yaml
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # JSON 배열(["https://a.com"]) 또는 쉼표 구분(https://a.com,https://b.com) 모두 허용
    ALLOWED_ORIGINS: Union[List[str], str] = ["*"]

    JWT_SECRET_KEY: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str = "sqlite:///./admin_logs.db"

    # 설정 시 서버 시작마다 admin 계정 비밀번호를 이 값으로 맞춤 (미설정 시 최초 생성에만 기본값 사용)
    ADMIN_PASSWORD: str = ""

    # backend/models 에 가중치가 없을 때 내려받을 Hugging Face 저장소 (예: username/veil-roberta-ner)
    # 비공개 저장소라면 HF_TOKEN 환경변수도 함께 설정
    NER_MODEL_REPO: str = ""

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-latest"

    GROQ_API_KEY: str = ""

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _parse_origins(cls, value):
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return ["*"]
            if value.startswith("["):
                return json.loads(value)
            return [v.strip().rstrip("/") for v in value.split(",") if v.strip()]
        return value

    class Config:
        env_file = ".env"


settings = Settings()


def load_policy() -> dict:
    config_path = os.path.join(os.path.dirname(__file__), "../../config.yaml")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}
