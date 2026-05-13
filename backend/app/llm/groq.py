from groq import AsyncGroq
from app.core.config import settings
from dotenv import load_dotenv
load_dotenv()

class GroqLLM:
    def __init__(self):
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def chat(self, messages: list) -> str:
        response = await self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
        )
        return response.choices[0].message.content

def get_groq_llm():
    return GroqLLM()