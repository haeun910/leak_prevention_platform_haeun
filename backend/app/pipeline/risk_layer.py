from typing import List, Tuple

from app.schemas.models import DetectedEntity


RISK_WEIGHTS = {"high": 10, "medium": 5, "low": 1}


def apply_risk_layer(
    masked_text: str,
    original_text: str,
    entities: List[DetectedEntity],
) -> Tuple[str, List[DetectedEntity], str]:
    if not entities:
        return masked_text, entities, "none"

    score = sum(RISK_WEIGHTS.get(entity.risk_level, 1) for entity in entities)
    if len({entity.entity_type for entity in entities}) >= 2:
        score += 5

    if score >= 15:
        overall_risk = "high"
    elif score >= 7:
        overall_risk = "medium"
    else:
        overall_risk = "low"

    return masked_text, entities, overall_risk
