from typing import List
from app.schemas.models import DetectedEntity
from app.pipeline.exception_keywords import find_keyword_spans, overlaps_any
import os
import threading
# 토크나이저, 모델을 전역 변수 선언
_tokenizer = None
_model = None
_load_lock = threading.Lock()
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../models")


def _add_windows_dll_dirs():
    if os.name != "nt" or not hasattr(os, "add_dll_directory"):
        return
    site_packages = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../venv/Lib/site-packages"))
    for dll_dir in (
        os.path.join(site_packages, "torch", "lib"),
        os.path.join(site_packages, "Library", "bin"),
    ):
        if os.path.isdir(dll_dir):
            os.add_dll_directory(dll_dir)

# ══════════════════════════════════════════ < 모델 개인정보 탐지 및 마스킹 > ══════════════════════════════════════════
# 마스킹 태깅 레이블
NER_MASK_LABELS = {
    "NAME":           "[이름]",
    "PER":            "[이름]",
    "PERSON":         "[이름]",
    "LOC":            "[주소]",
    "ADDRESS":        "[주소]",
    "PASSWORD":       "[비밀번호]",
    "API_KEY":        "[API키]",
    "DOCUMENT":       "[문서명]",
    "DOC_FILE":       "[문서명]",
    "CONTRACT_NAME":  "[계약서명]",
    "PROPOSAL_NAME":  "[제안서명]",
    "ORG":            "[기관명]",
    "ORG_NAME":       "[기관명]",
    "PROJECT":        "[프로젝트명]",
    "PROJECT_NAME":   "[프로젝트명]",
    "FINANCIAL":      "[금융번호]",
    "FINANCIAL_NUM":  "[금융번호]",
}

# 위험도 매핑
NER_RISK_MAP = {
    "PASSWORD":       "high",
    "API_KEY":        "high",
    "FINANCIAL":      "high",
    "FINANCIAL_NUM":  "high",
    "NAME":           "medium",
    "PERSON":         "medium",
    "PER":            "medium",
    "ADDRESS":        "medium",
    "LOC":            "medium",
    "CONTRACT_NAME":  "medium",
    "DOCUMENT":       "low",
    "DOC_FILE":       "low",
    "PROPOSAL_NAME":  "low",
    "ORG":            "low",
    "ORG_NAME":       "low",
    "PROJECT":        "low",
    "PROJECT_NAME":   "low",
}


# < 모델 가중치 확인 > ──────────────────────────────────────────
# 가중치(model.safetensors)는 용량 문제로 git에 포함되지 않으므로,
# 배포 환경에서는 NER_MODEL_REPO(Hugging Face 저장소)에서 내려받는다.
def _ensure_model_weights(model_path):
    if any((model_path / name).exists() for name in ("model.safetensors", "pytorch_model.bin")):
        return
    from app.core.config import settings
    if not settings.NER_MODEL_REPO:
        raise FileNotFoundError(
            f"NER 모델 가중치가 없습니다: {model_path}. "
            "model.safetensors를 배치하거나 NER_MODEL_REPO 환경변수를 설정해 주세요."
        )
    from huggingface_hub import snapshot_download
    print(f"[NER] 모델 다운로드: {settings.NER_MODEL_REPO} → {model_path}")
    snapshot_download(repo_id=settings.NER_MODEL_REPO, local_dir=str(model_path))


# < 모델 로드 > ──────────────────────────────────────────
def _load_model():
    with _load_lock:
        if _tokenizer is None or _model is None: # 싱글턴 패턴 : 불필요한 중복 로딩 방지
            _load_model_unlocked()
    return _tokenizer, _model


def _load_model_unlocked():
    global _tokenizer, _model
    _add_windows_dll_dirs()
    from transformers import AutoTokenizer, AutoModelForTokenClassification
    from pathlib import Path   # ← 추가 

    model_path = Path(os.path.abspath(MODEL_DIR))  # ← Path 객체로 변환 (허깅페이스가 안정적으로 처리하도록 함)
    _ensure_model_weights(model_path)
    print(f"[NER] 로컬 모델 로딩: {model_path}")
    # local_files_only : 허깅페이스 모델을 로컬에서만 사용하도록 강제
    tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=True, local_files_only=True) # 로컬 경로에서 토크나이저 불러옴
    model, loading_info = AutoModelForTokenClassification.from_pretrained(
        model_path, local_files_only=True, output_loading_info=True
    ) # 모델을 로컬 경로에서 불러옴
    _validate_model(model, loading_info)
    model.eval() # 모델을 추론 전용 모드로 전환
    _tokenizer, _model = tokenizer, model
    print(f"[NER] 모델 로드 완료 ({model.config.model_type}, 레이블 {len(model.config.id2label)}개)")


# < 모델 검증 > ──────────────────────────────────────────
# 파인튜닝되지 않은 베이스 모델(klue/roberta-base 등)이나 config와 가중치가 맞지 않는 모델은
# 분류 레이어가 랜덤 값으로 채워져 엉뚱한 단어를 마스킹하므로 로드 단계에서 막는다.
def _validate_model(model, loading_info):
    missing = loading_info.get("missing_keys") or []
    if missing:
        raise RuntimeError(
            f"NER 모델 가중치가 config와 맞지 않습니다 (누락된 가중치 {len(missing)}개, 예: {missing[:3]}). "
            "파인튜닝 후 save_pretrained로 저장한 폴더 전체(config.json, 토크나이저 포함)를 사용해 주세요."
        )
    labels = {label.split("-", 1)[-1] for label in model.config.id2label.values()}
    if not labels & NER_MASK_LABELS.keys():
        raise RuntimeError(
            f"NER 모델 레이블({sorted(labels)[:5]} ...)이 마스킹 레이블과 맞지 않습니다. "
            "파인튜닝 시 id2label/label2id를 config에 저장했는지 확인해 주세요."
        )


# < 개인정보 탐지 및 마스킹 > ──────────────────────────────────────────
def apply_ner_layer(text: str, exception_keywords=()) -> tuple[str, List[DetectedEntity]]:
    _add_windows_dll_dirs()
    import torch
    tokenizer, model = _load_model()
    entities: List[DetectedEntity] = []

    # (1) 토크나이징 : 텍스트를 토큰으로 분리
    inputs = tokenizer(
        text,
        return_tensors="pt", # pytorch 텐서 형태 변환
        truncation=True, # 512 토큰 초과 시 자름
        max_length=512, # 최대 토큰 수
        return_offsets_mapping=True, # 각 토큰의 원본 문자열 offset(몇 번째 글자인지)을 알 수 있음
    )
    offset_mapping = inputs.pop("offset_mapping")[0].tolist() # offset_mapping은 모델 입력에서 제거하여 따로 보관

    # (2) 모델 추론 : 모델이 각 토큰에 대해 labels 확률을 출력하면, argmax로 가장 높은 확률의 label index를 선택
    with torch.no_grad(): # torch.no_grad() : 불필요한 gradient 계산을 막아줌
        outputs = model(**inputs)
    predictions = torch.argmax(outputs.logits, dim=2)[0].tolist() # 각 토큰의 레이블 확률 중 가장 높은 것의 인덱스를 선택
    id2label = model.config.id2label # 인덱스를 레이블 이름으로 변환하는 dict
    # BIO 순회에 필요한 상태 변수 초기화
    current_entity = None 
    current_start = None 
    current_end = None 
    masked_text = text 
    offset = 0 # 마스킹 후 밀린 위치 보정값
    protected = find_keyword_spans(text, exception_keywords) # 예외 키워드 위치 (마스킹 제외)

    # (3) BIO 태그 순회
    for pred_id, (char_start, char_end) in zip(predictions, offset_mapping):
        if char_start == char_end:
            continue # 특수 토큰 ([CLS], [SEP] 등) 스킵
        label = id2label[pred_id]
        if label.startswith("B-"): # 새 엔티티 시작
            if current_entity:
                masked_text, offset = _apply_mask(masked_text, current_entity, current_start, current_end, offset, entities, protected)
            current_entity = label[2:]
            current_start = char_start
            current_end = char_end
        elif label.startswith("I-") and current_entity == label[2:]: # 엔티티 계속 (끝 위치만 갱신)
            current_end = char_end
        else: # 엔티티 끝 → 이후 마스킹 실행
            if current_entity:
                masked_text, offset = _apply_mask(masked_text, current_entity, current_start, current_end, offset, entities, protected)
            current_entity = None
    # (4) 마지막 엔티티 처리
    if current_entity:
        masked_text, offset = _apply_mask(masked_text, current_entity, current_start, current_end, offset, entities, protected)

    return masked_text, entities


# < 마스킹 처리 함수 > ──────────────────────────────────────────
def _apply_mask(text, entity_type, start, end, offset, entities, protected=()): # 원본 단어 추출 (현재 텍스트, 엔티티 타입, 엔티티 위치, 위치 보정값, 탐지 결과 리스트, 예외 키워드 위치)
    if entity_type not in NER_MASK_LABELS: # NER_MASK_LABELS에 없는 타입이면 마스킹하지 않고 그냥 반환
        return text, offset
    if overlaps_any((start, end), protected): # 관리자가 승인한 예외 키워드와 겹치면 마스킹하지 않음
        return text, offset
    label = NER_MASK_LABELS[entity_type] # 엔티티 타입과 맞는 마스킹 레이블 가져오기
    original = text[start + offset: end + offset] 

    # 직책 태깅 레이블
    JOB_TITLES = [
        "대리", "과장", "차장", "부장", "팀장", "실장", "대표",
        "교수", "사원", "주임", "이사", "상무", "전무"
    ]
    
    # 직책 마스킹 예외 처리
    if entity_type in ["PER", "PERSON"]:

        # 1. 직책만 → 무시
        if original in JOB_TITLES:
            return text, offset

        # 2. 이름+직책 → 이름만 마스킹
        for title in JOB_TITLES:
            if original.endswith(title):
                name_part = original.replace(title, "").strip()

                if len(name_part) < 2:
                    return text, offset

                adj_start = start + offset
                adj_end = adj_start + len(name_part)

                entities.append(DetectedEntity(
                    original=name_part,
                    masked=label,
                    entity_type=entity_type,
                    start=adj_start,
                    end=adj_end,
                    stage="ner",
                    risk_level=NER_RISK_MAP.get(entity_type, "medium"),
                ))

                new_text = text[:adj_start] + label + text[adj_end:]
                new_offset = offset + len(label) - len(name_part)

                return new_text, new_offset
            
    adj_start = start + offset  
    adj_end = end + offset

    # 탐지 결과를 DetectedEntity 객체로 만들어 리스트에 추가
    entities.append(DetectedEntity(
        original=original, # 원본
        masked=label, # 마스킹
        entity_type=entity_type, # 엔티티 타입
        start=adj_start, # 시작
        end=adj_end, # 끝
        stage="ner", # 탐지 단계
        risk_level=NER_RISK_MAP.get(entity_type, "medium"), # 위험도
    ))

    new_text = text[:adj_start] + label + text[adj_end:]
    new_offset = offset + len(label) - (end - start) # 다음 마스킹을 위해 offset 갱신
    return new_text, new_offset # _apply_mask() 호출에 전달
