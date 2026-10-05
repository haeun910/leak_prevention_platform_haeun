from typing import Iterable, List, Tuple


# < 예외 키워드 위치 탐색 > ──────────────────────────────────────────
# 관리자가 승인한 예외 키워드가 텍스트의 어느 위치에 나오는지 찾는다.
# 탐지된 개인정보가 이 위치와 겹치면 마스킹하지 않는다. (영문은 대소문자 무시)
def find_keyword_spans(text: str, keywords: Iterable[str]) -> List[Tuple[int, int]]:
    spans = []
    lowered = text.lower()
    for keyword in keywords:
        keyword = (keyword or "").strip().lower()
        if not keyword:
            continue
        start = lowered.find(keyword)
        while start != -1:
            spans.append((start, start + len(keyword)))
            start = lowered.find(keyword, start + 1)
    return spans


def overlaps_any(span: Tuple[int, int], spans: Iterable[Tuple[int, int]]) -> bool:
    start, end = span
    return any(start < s_end and s_start < end for s_start, s_end in spans)
