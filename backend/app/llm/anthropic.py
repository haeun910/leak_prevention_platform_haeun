from typing import List, Dict
from app.llm.base import BaseLLM
from app.core.config import settings


class AnthropicLLM(BaseLLM):
    def __init__(self):
        self.model = settings.ANTHROPIC_MODEL

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY가 설정되지 않았습니다. backend/.env를 확인해 주세요.")
        from anthropic import AsyncAnthropic

        system_messages = [m["content"] for m in messages if m.get("role") == "system"]
        chat_messages = [
            {"role": m.get("role", "user"), "content": m.get("content", "")}
            for m in messages
            if m.get("role") in {"user", "assistant"}
        ]
        async with AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) as client:
            response = await client.messages.create(
                model=self.model,
                max_tokens=2048,
                system="\n".join(system_messages) if system_messages else None,
                messages=chat_messages,
            )
        return "".join(block.text for block in response.content if getattr(block, "type", "") == "text")

    def get_provider_name(self) -> str:
        return "anthropic"


def get_anthropic_llm() -> AnthropicLLM:
    return AnthropicLLM()
