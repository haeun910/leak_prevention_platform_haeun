from abc import ABC, abstractmethod
from typing import List, Dict


class BaseLLM(ABC):
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]]) -> str:
        """메시지 목록을 받아 응답 문자열 반환"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        pass
