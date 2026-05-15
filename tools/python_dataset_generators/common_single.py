"""
개별 데이터셋 생성 스크립트에서 공유하는 실행 helper.

각 생성 파일은 이 helper를 호출해서 한 타입/라벨의 CSV만 만든다.
공통 생성 규칙과 검증 함수는 ../generate_ner_datasets.py에 정의되어 있다.
"""

from __future__ import annotations

import random
import sys
from pathlib import Path
from typing import Callable


TOOLS_DIR = Path(__file__).resolve().parents[1]
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from generate_ner_datasets import OUT_DIR, RANDOM_SEED, generate_rows, validate, write_csv  # noqa: E402


def run_single(
    *,
    entity_type: str,
    label: str,
    generator: Callable[[int], tuple[str, str]],
    filename: str,
) -> None:
    """한 개 CSV 파일만 생성하고 자체 검증 결과를 출력한다."""

    random.seed(f"{RANDOM_SEED}:{entity_type}:{label}")
    rows = generate_rows(entity_type, label, generator, global_texts=set())
    output_path = OUT_DIR / filename
    write_csv(output_path, rows)

    summary = validate(rows)
    print(f"output: {output_path}")
    print(summary)

    if summary["bad_span"] or summary["bad_pattern"]:
        raise SystemExit(f"validation failed: {summary}")
