from typing import List
from app.schemas.models import DetectedEntity
import os
os.environ["TRANSFORMERS_OFFLINE"] = "1" # guggingface 모델을 로컬에서만 사용하도록 강제
# 토크나이저, 모델을 전역 변수 선언
_tokenizer = None
_model = None
MODEL_DIR = os.path.join(os.path.dirname(__file__), "../../models")

# ══════════════════════════════════════════ < 모델 개인정보 탐지 및 마스킹 > ══════════════════════════════════════════
# 탐지 유형 한국어 변환 매핑
NER_TYPE_KO = {
    "PERSON":         "이름",
    "NAME":           "이름",
    "ADDRESS":        "주소",
    "PASSWORD":       "비밀번호",
    "API_KEY":        "API키",
    "CONTRACT_NAME":  "계약서",
    "PROPOSAL_NAME":  "제안서",
    "DOC_FILE":       "문서명",
    "PROJECT_NAME":   "프로젝트",
    "FINANCIAL_NUM":  "재무수치",
    "ORG_NAME":       "기관명",
}

# 마스킹 태깅 레이블
NER_MASK_LABELS = {
    "PERSON":         "[이름]",
    "NAME":           "[이름]",
    "ADDRESS":        "[주소]",
    "PASSWORD":       "[비밀번호]",
    "API_KEY":        "[API키]",
    "CONTRACT_NAME":  "[계약서]",
    "PROPOSAL_NAME":  "[제안서]",
    "DOC_FILE":       "[문서명]",
    "PROJECT_NAME":   "[프로젝트]",
    "FINANCIAL_NUM":  "[재무수치]",
    "ORG_NAME":       "[기관명]",
}

# 위험도 매핑
NER_RISK_MAP = {
    "비밀번호":         "high",
    "API 키":           "high",
    "재무수치":         "high",
    "프로젝트":         "medium",
    "제안서":           "medium",
    "주소":             "medium",
    "계약서":           "medium",
    "문서명":           "medium",
    "이름":             "low",
    "기관명":           "low",
}


# < 모델 로드 > ──────────────────────────────────────────
def _load_model():
    global _tokenizer, _model
    if _tokenizer is None or _model is None: # 싱글턴 패턴 : 불필요한 중복 로딩 방지
        from transformers import AutoTokenizer, AutoModelForTokenClassification
        from pathlib import Path   # ← 추가 

        model_path = Path(os.path.abspath(MODEL_DIR))  # ← Path 객체로 변환 (허깅페이스가 안정적으로 처리하도록 함)
        print(f"[NER] 로컬 모델 로딩: {model_path}")
        _tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=True) # 로컬 경로에서 토크나이저 불러옴
        _model = AutoModelForTokenClassification.from_pretrained(model_path) # 모델을 로컬 경로에서 불러옴
        _model.eval() # 모델을 추론 전용 모드로 전환
        print("[NER] 모델 로드 완료")
    return _tokenizer, _model


# < 개인정보 탐지 및 마스킹 > ──────────────────────────────────────────
def apply_ner_layer(text: str) -> tuple[str, List[DetectedEntity]]:
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

    # (3) BIO 태그 순회
    for pred_id, (char_start, char_end) in zip(predictions, offset_mapping):
        if char_start == char_end:
            continue # 특수 토큰 ([CLS], [SEP] 등) 스킵
        label = id2label[pred_id]
        if label.startswith("B-"): # 새 엔티티 시작
            if current_entity:
                masked_text, offset = _apply_mask(masked_text, current_entity, current_start, current_end, offset, entities)
            current_entity = label[2:]
            current_start = char_start
            current_end = char_end
        elif label.startswith("I-") and current_entity == label[2:]: # 엔티티 계속 (끝 위치만 갱신)
            current_end = char_end
        else: # 엔티티 끝 → 이후 마스킹 실행
            if current_entity:
                masked_text, offset = _apply_mask(masked_text, current_entity, current_start, current_end, offset, entities)
            current_entity = None
    # (4) 마지막 엔티티 처리
    if current_entity:
        masked_text, offset = _apply_mask(masked_text, current_entity, current_start, current_end, offset, entities)

    return masked_text, entities



# < 마스킹 처리 함수 > ──────────────────────────────────────────
def _apply_mask(text, entity_type, start, end, offset, entities): # 원본 단어 추출 (현재 텍스트, 엔티티 타입, 엔티티 위치, 위치 보정값, 탐지 결과 리스트)
    if entity_type not in NER_MASK_LABELS: # NER_MASK_LABELS에 없는 타입이면 마스킹하지 않고 그냥 반환
        return text, offset
    label = NER_MASK_LABELS[entity_type] # 엔티티 타입과 맞는 마스킹 레이블 가져오기
    original = text[start + offset: end + offset] 

    # 직책 태깅 레이블
    JOB_TITLES = [
        "대리", "과장", "차장", "부장", "팀장", "실장", "대표",
        "교수", "사원", "주임", "이사", "상무", "전무"
    ]
    
    # 직책 마스킹 예외 처리
    if entity_type in ["이름"]:

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
                    risk_level=NER_RISK_MAP.get(entity_type, "low"),
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
        entity_type=NER_TYPE_KO.get(entity_type, entity_type), # 엔티티 타입 및 한국어 변환
        start=adj_start, # 시작
        end=adj_end, # 끝
        stage="ner", # 탐지 단계
        risk_level=NER_RISK_MAP.get(entity_type, "medium"), # 위험도
    ))

    new_text = text[:adj_start] + label + text[adj_end:]
    new_offset = offset + len(label) - (end - start) # 다음 마스킹을 위해 offset 갱신
    return new_text, new_offset # _apply_mask() 호출에 전달
