import re

from app.schemas.models import DetectedEntity


PATTERNS = [
    ("phone", "medium", "[PHONE]", re.compile(r"(?<!\d)(?:01[016789]|02|0[3-6][1-5]|070|080)[-\s]?\d{3,4}[-\s]?\d{4}(?!\d)")),
    ("email", "medium", "[EMAIL]", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("rrn", "high", "[RRN]", re.compile(r"(?<!\d)\d{6}-?[1-4]\d{6}(?!\d)")),
    ("business_number", "medium", "[BRN]", re.compile(r"(?<!\d)\d{3}-?\d{2}-?\d{5}(?!\d)")),
    ("card_number", "high", "[CARD]", re.compile(r"(?<!\d)(?:\d{4}[-\s]?){3}\d{4}(?!\d)")),
    ("ipv4", "low", "[IP]", re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")),
]


def _overlaps(span: tuple[int, int], spans: list[tuple[int, int]]) -> bool:
    start, end = span
    return any(start < used_end and used_start < end for used_start, used_end in spans)


def detect_and_mask(text: str) -> dict:
    matches = []
    used_spans = []
    for entity_type, risk_level, label, pattern in PATTERNS:
        for match in pattern.finditer(text):
            span = match.span()
            if _overlaps(span, used_spans):
                continue
            used_spans.append(span)
            matches.append((span[0], span[1], entity_type, risk_level, label, match.group(0)))

    matches.sort(key=lambda item: item[0])
    masked = text
    offset = 0
    detections = []
    for start, end, entity_type, risk_level, label, original in matches:
        adj_start = start + offset
        adj_end = end + offset
        masked = masked[:adj_start] + label + masked[adj_end:]
        offset += len(label) - (end - start)
        detections.append(
            DetectedEntity(
                original=original,
                masked=label,
                entity_type=entity_type,
                start=start,
                end=end,
                stage="regex",
                risk_level=risk_level,
            )
        )

    return {"masked": masked, "detections": detections}
