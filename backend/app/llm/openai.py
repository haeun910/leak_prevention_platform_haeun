from typing import Dict, List

import httpx
from openai import AsyncOpenAI

from app.core.config import settings
from app.llm.base import BaseLLM


class OpenAILLM(BaseLLM):
    def __init__(self):
        self.model = settings.OPENAI_MODEL

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        if not settings.OPENAI_API_KEY:
            raise RuntimeError("OPEN_API_KEY가 설정되지 않았습니다.")

        async with httpx.AsyncClient() as http_client:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, http_client=http_client)
            response = await client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
        return response.choices[0].message.content or ""

    def get_provider_name(self) -> str:
        return "openai"


def get_openai_llm() -> OpenAILLM:
    return OpenAILLM()
