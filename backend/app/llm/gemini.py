from app.core.config import settings

class GeminiLLM:
    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY가 설정되지 않았습니다. backend/.env를 확인해 주세요.")
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

    async def chat(self, messages: list) -> str:
        prompt = messages[-1]["content"]
        response = self.model.generate_content(prompt)
        return response.text

def get_gemini_llm():
    return GeminiLLM()
