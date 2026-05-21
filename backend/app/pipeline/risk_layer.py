from typing import List, Tuple
from app.schemas.models import DetectedEntity


# 위험도 점수 가중치
RISK_WEIGHTS = {
    "high": 10,
    "medium": 5,
    "low": 1,
}

# 복합 위험도 키워드 (문맥 기반 추가 탐지)
HIGH_RISK_KEYWORDS = [
    "비밀", "기밀", "내부 전용", "사내 기밀", "대외비",
    "패스워드", "password", "secret", "private key",
    "전략", "인수", "합병", "특허",
]

MEDIUM_RISK_KEYWORDS = [
    "거래처", "매출", "영업", "클라이언트", "계약",
    "예산", "원가", "단가",
]


def apply_risk_layer(
    masked_text: str,
    original_text: str,
    entities: List[DetectedEntity],
    ) -> Tuple[str, List[DetectedEntity], str]:
    """
    3차 위험도 분석
    - 이미 감지된 엔티티들의 위험도 재평가
    - 문맥 키워드로 전체 위험도 상향 가능
    - 반환: (텍스트 그대로, 업데이트된 엔티티, 전체 위험도)
    """
    if not entities:
        return masked_text, entities, "none"

    total_score = 0

    # 1. 엔티티 위험도 점수 합산
    for e in entities:
        total_score += RISK_WEIGHTS.get(e.risk_level, 1)

    text_lower = original_text.lower() 

    # 2. 문맥 키워드 보정
    # (1) 고위험 문맥
    for kw in HIGH_RISK_KEYWORDS:
        if kw in text_lower:
            total_score += 8
            break

    # (2) 중위험 문맥
    for kw in MEDIUM_RISK_KEYWORDS:
        if kw in text_lower:
            total_score += 3
            break

    # 복합 엔티티 페널티 (2종 이상 감지 시)
    entity_types = set(e.entity_type for e in entities)
    if len(entity_types) >= 2:
        total_score += 5

    # 전체 위험도 판정
    if total_score >= 10:
        overall_risk = "high"
    elif total_score >= 5:
        overall_risk = "medium"
    else:
        overall_risk = "low"

    # high 위험도인 경우 모든 엔티티 위험도 상향
    if overall_risk == "high":
        for e in entities:
            if e.risk_level == "low":
                e.risk_level = "medium"

    return masked_text, entities, overall_risk
