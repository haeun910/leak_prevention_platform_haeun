from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.schemas.models import ChatRequest, ChatResponse, MaskRequest, MaskResponse
from app.pipeline.regex_layer import detect_and_mask
from app.pipeline.ner_layer import apply_ner_layer
from app.pipeline.risk_layer import apply_risk_layer
from app.llm.openai import get_openai_llm
from app.llm.anthropic import get_anthropic_llm
from app.llm.gemini import get_gemini_llm
from app.core.database import get_db, MaskingLog, ChatConversation, ChatMessage, ExceptionRequest
from app.core.security import get_current_user  # JWT에서 유저 꺼내는 함수
from datetime import datetime, timezone, timedelta
KST = timezone(timedelta(hours=9))

router = APIRouter()

LLM_PROVIDERS = {
    "openai": get_openai_llm,
    "anthropic": get_anthropic_llm,
    "gemini": get_gemini_llm,
}

# < 마스킹 파이프라인 (내부 로직) > : 텍스트 받아서 마스킹하고 엔티티 반환
def run_masking_pipeline(text: str):
    original_text = text
    all_entities = []

    # 1차 정규표현식 필터링 : 마스킹 된 텍스트 반환
    result = detect_and_mask(original_text) # ← dict 반환
    text_after_regex = result["masked"]  # ← 마스킹 된 텍스트
    regex_entities = result["detections"]
    all_entities.extend(regex_entities) # ← 엔티티 목록

    # 2차 모델 필터링
    # 로컬 NER 모델/torch 환경이 준비되지 않아도 정규식 마스킹과 LLM 흐름은 유지한다.
    try:
        text_after_ner, ner_entities = apply_ner_layer(text_after_regex)
        all_entities.extend(ner_entities)
    except Exception as e:
        print("NER ERROR:", repr(e))
        text_after_ner = text_after_regex

    # 3차 위험도 판정
    text_after_risk, all_entities, overall_risk = apply_risk_layer(
        masked_text=text_after_ner,
        original_text=original_text,
        entities=all_entities,
    )
    
    return text_after_risk, all_entities, overall_risk


# < chat 엔드포인트 정의 > ← API (외부에 노출) : 프론트에서 HTTP 요청하면 받음
@router.post("/chat", response_model=ChatResponse)
async def chat_with_masking(req: ChatRequest, db: Session = Depends(get_db)):
    session_id = req.session_id or str(uuid.uuid4())
    masked_text, entities, overall_risk = run_masking_pipeline(req.text) # ← run_masking_pipeline() 호출 : 결과 반환
    was_masked = len(entities) > 0

    if was_masked:
        db.add(MaskingLog(
            session_id=session_id,
            entity_types=",".join(set(e.entity_type for e in entities)),
            detection_stage=",".join(set(e.stage for e in entities)),
            risk_level=overall_risk,
            masked_count=len(entities),
        ))
        db.commit()

    provider = (req.provider or "openai").lower()
    if provider not in LLM_PROVIDERS:
        raise HTTPException(status_code=400, detail="지원하지 않는 LLM provider입니다.")

    try:
        llm = LLM_PROVIDERS[provider]()
        answer = await llm.chat([{"role": "user", "content": masked_text}])
    except Exception as e:
        print("LLM ERROR:", repr(e))
        raise HTTPException(status_code=502, detail=f"LLM API 오류: {str(e)}")
    '''# LLM 호출 제거 (임시)
    answer = "[LLM 비활성화 상태] 마스킹 결과만 반환합니다."'''

    return ChatResponse(
        question=masked_text,
        answer=answer,
        was_masked=was_masked,
        detected_entities=entities,
        overall_risk=overall_risk,
    )

# < preview 엔드포인트 정의 > ← API (외부에 노출) : 프론트에서 HTTP 요청하면 받음
@router.post("/preview", response_model=MaskResponse)
async def preview_masking(req: MaskRequest):
    """마스킹 결과 미리보기 (LLM 호출 없음)"""
    masked_text, entities, overall_risk = run_masking_pipeline(req.text) # ← run_masking_pipeline() 호출 : 결과 반환
    return MaskResponse(
        # original_text는 보안 정책 상 개인정보를 포함 가능성이 있는 것도 있으니 응답에 포함하지 않음 ⇒ 필드 제거
        masked_text=masked_text,
        detected_entities=entities,
        was_masked=len(entities) > 0,
        overall_risk=overall_risk,
    )

# < 대화 목록 조회 >
@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    convs = db.query(ChatConversation)\
        .filter(ChatConversation.user_id == current_user.id)\
        .order_by(ChatConversation.updated_at.desc())\
        .all()
    return [
        {"id": c.id, "title": c.title, "project_id": c.project_id,
         "updated_at": c.updated_at.isoformat()}
        for c in convs
    ]

# < 특정 대화 메시지 조회 >
@router.get("/conversations/{conv_id}/messages")
def get_messages(conv_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다.")
    msgs = db.query(ChatMessage)\
        .filter(ChatMessage.conversation_id == conv_id)\
        .order_by(ChatMessage.timestamp)\
        .all()
    return [
        {"id": m.id, "role": m.role, "content": m.content,
         "was_masked": m.was_masked, "entities": m.entities,
         "risk_level": m.risk_level, "timestamp": m.timestamp.isoformat()}
        for m in msgs
    ]

# < 대화 저장 (메시지 추가) >
@router.post("/conversations/{conv_id}/messages")
def save_messages(conv_id: str, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # 대화 없으면 새로 생성
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        conv = ChatConversation(
            id=conv_id,
            user_id=current_user.id,
            title=body.get("title", ""),
        )
        db.add(conv)
    else:
        conv.title = body.get("title", conv.title)
        conv.updated_at = datetime.now(KST)

    for m in body.get("messages", []):
        exists = db.query(ChatMessage).filter(ChatMessage.id == m["id"]).first()
        if not exists:
            db.add(ChatMessage(
                id=m["id"],
                conversation_id=conv_id,
                role=m["role"],
                content=m["content"],           # 마스킹된 텍스트만 저장
                was_masked=m.get("was_masked", False),
                entities=m.get("entities", []),
                risk_level=m.get("risk_level", "none"),
            ))
    db.commit()
    return {"ok": True}

# < 대화 삭제 >
@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다.")
    db.query(ChatMessage).filter(ChatMessage.conversation_id == conv_id).delete()
    db.delete(conv)
    db.commit()
    return {"ok": True}


@router.post("/exception-requests")
def create_exception_request(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    keyword = body.get("keyword", "").strip()
    reason = body.get("reason", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="예외 처리할 키워드를 입력해 주세요.")
    if not reason:
        raise HTTPException(status_code=400, detail="요청 사유를 입력해 주세요.")

    row = ExceptionRequest(
        keyword=keyword,
        requester=current_user.name or current_user.username,
        department=current_user.department or "",
        reason=reason,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": row.status}
