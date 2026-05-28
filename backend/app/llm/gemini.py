from typing import Dict, List

import google.generativeai as genai

from app.core.config import settings
from app.llm.base import BaseLLM


class GeminiLLM(BaseLLM):
    def __init__(self):
        self.model = settings.GEMINI_MODEL

    async def chat(self, messages: List[Dict[str, str]]) -> str:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다.")

        genai.configure(api_key=settings.GEMINI_API_KEY)

        # system 메시지 분리
        system_prompt = next(
            (m["content"] for m in messages if m["role"] == "system"), None
        )
        filtered_messages = [m for m in messages if m["role"] != "system"]

        # Gemini 형식으로 변환
        gemini_messages = [
            {
                "role": "model" if m["role"] == "assistant" else "user",
                "parts": [m["content"]]
            }
            for m in filtered_messages
        ]

        model = genai.GenerativeModel(
            self.model,
            system_instruction=system_prompt
        )

        chat = model.start_chat(history=gemini_messages[:-1])
        response = await chat.send_message_async(gemini_messages[-1]["parts"][0])
        return response.text or ""

    def get_provider_name(self) -> str:
        return "gemini"


def get_gemini_llm() -> GeminiLLM:
    return GeminiLLM()