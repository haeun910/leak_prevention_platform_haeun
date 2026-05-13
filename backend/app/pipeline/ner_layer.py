from typing import List

from app.schemas.models import DetectedEntity


def apply_ner_layer(text: str) -> tuple[str, List[DetectedEntity]]:
    return text, []
