"""마스킹 파이프라인 처리 시간 측정

실행: backend 폴더에서 `python -m tools.benchmark_pipeline --repeat 20`
- 문장 길이별로 정규식 / NER / 위험도 / 합계 시간을 반복 측정해 평균과 p95를 출력
- 첫 호출은 모델 로딩이 포함되므로 따로 표시하고 통계에서는 제외
"""
import argparse
import statistics
import time

from app.api.mask import run_masking_pipeline

SAMPLES = {
    "짧은 문장": "고객 연락처 010-2345-6789로 안내해 줘",
    "보통 문장": "환불 계좌 국민은행 123456-01-234567, 고객 연락처 010-2345-6789로 김민준 팀장에게 안내 메일 써줘",
    "긴 문장": (
        "스카이넷 2차 프로젝트 정산 건으로 협력사 담당자 박서연 님께 연락드립니다. "
        "계약서 초안은 2026년 유지보수 계약서 검토본.docx로 공유드렸고, 세금계산서는 사업자등록번호 123-45-67890 기준으로 발행 부탁드립니다. "
        "입금 계좌는 신한은행 110-123-456789이며, 문의는 010-9876-5432 또는 seoyeon@example.com으로 주시면 됩니다. "
        "운영 서버 192.168.0.12 접속 비밀번호는 별도 메일로 전달하겠습니다."
    ),
}
STAGES = ("regex", "ner", "risk", "total")


def p95(values):
    ordered = sorted(values)
    return ordered[max(0, int(len(ordered) * 0.95) - 1)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repeat", type=int, default=20)
    args = parser.parse_args()

    # 첫 호출 (모델 로딩 포함)
    first = {}
    t0 = time.perf_counter()
    run_masking_pipeline(SAMPLES["짧은 문장"], timings=first)
    print(f"\n첫 호출 (모델 로딩 포함): {(time.perf_counter() - t0) * 1000:.1f}ms\n")

    print(f"{'문장':<8}{'글자':>6}" + "".join(f"{s + ' 평균':>14}{s + ' p95':>12}" for s in STAGES))
    for name, text in SAMPLES.items():
        runs = {stage: [] for stage in STAGES}
        for _ in range(args.repeat):
            timings = {}
            run_masking_pipeline(text, timings=timings)
            for stage in STAGES:
                runs[stage].append(timings[stage])
        row = f"{name:<8}{len(text):>6}"
        for stage in STAGES:
            row += f"{statistics.mean(runs[stage]):>12.1f}ms{p95(runs[stage]):>10.1f}ms"
        print(row)


if __name__ == "__main__":
    main()
