from typing import Dict, List

import anthropic

from app.core.config import settings
from app.llm.base import BaseLLM


class ClaudeLLM(BaseLLM):
    def __init__(self):
        self.model = settings.CLAUDE_MODEL 

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        if not settings.CLAUDE_API_KEY:
            raise RuntimeError("CLAUDE_API_KEY가 설정되지 않았습니다.")

        client = anthropic.AsyncAnthropic(api_key=settings.CLAUDE_API_KEY)

        # system 메시지 분리
        system_prompt = next(
            (m["content"] for m in messages if m["role"] == "system"), None
        )
        filtered_messages = [m for m in messages if m["role"] != "system"]

        # system_prompt가 None이면 파라미터에서 제외
        kwargs = {
            "model": self.model,
            "max_tokens": 1024,
            "messages": filtered_messages,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = await client.messages.create(**kwargs)
        return response.content[0].text or ""

    def get_provider_name(self) -> str:
        return "claude"


def get_claude_llm() -> ClaudeLLM:
    return ClaudeLLM()