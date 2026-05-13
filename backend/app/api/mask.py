import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import ChatConversation, ChatMessage, ExceptionRequest, MaskingLog, get_db
from app.core.security import get_current_user
from app.llm.anthropic import get_anthropic_llm
from app.llm.gemini import get_gemini_llm
from app.llm.groq import get_groq_llm
from app.llm.openai import get_openai_llm
from app.pipeline.ner_layer import apply_ner_layer
from app.pipeline.regex_layer import detect_and_mask
from app.pipeline.risk_layer import apply_risk_layer
from app.schemas.models import ChatRequest, ChatResponse, MaskRequest, MaskResponse


KST = timezone(timedelta(hours=9))
router = APIRouter()

LLM_PROVIDERS = {
    "openai": get_openai_llm,
    "anthropic": get_anthropic_llm,
    "gemini": get_gemini_llm,
    "groq": get_groq_llm,
}


def run_masking_pipeline(text: str):
    original_text = text
    all_entities = []

    result = detect_and_mask(original_text)
    text_after_regex = result["masked"]
    all_entities.extend(result["detections"])

    try:
        text_after_ner, ner_entities = apply_ner_layer(text_after_regex)
        all_entities.extend(ner_entities)
    except Exception as exc:
        print("NER ERROR:", repr(exc))
        text_after_ner = text_after_regex

    return apply_risk_layer(
        masked_text=text_after_ner,
        original_text=original_text,
        entities=all_entities,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_masking(req: ChatRequest, db: Session = Depends(get_db)):
    session_id = req.session_id or str(uuid.uuid4())
    masked_text, entities, overall_risk = run_masking_pipeline(req.text)
    was_masked = bool(entities)

    if was_masked:
        db.add(
            MaskingLog(
                session_id=session_id,
                entity_types=",".join(sorted({entity.entity_type for entity in entities})),
                detection_stage=",".join(sorted({entity.stage for entity in entities})),
                risk_level=overall_risk,
                masked_count=len(entities),
                was_masked=True,
                input_length=len(req.text),
            )
        )
        db.commit()

    provider = (req.provider or "openai").lower()
    if provider not in LLM_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unsupported LLM provider: {provider}")

    try:
        llm = LLM_PROVIDERS[provider]()
        answer = await llm.chat([{"role": "user", "content": masked_text}])
    except Exception as exc:
        print("LLM ERROR:", repr(exc))
        raise HTTPException(status_code=502, detail=f"LLM API error: {exc}") from exc

    return ChatResponse(
        question=masked_text,
        answer=answer,
        was_masked=was_masked,
        detected_entities=entities,
        overall_risk=overall_risk,
    )


@router.post("/preview", response_model=MaskResponse)
async def preview_masking(req: MaskRequest):
    masked_text, entities, overall_risk = run_masking_pipeline(req.text)
    return MaskResponse(
        masked_text=masked_text,
        detected_entities=entities,
        was_masked=bool(entities),
        overall_risk=overall_risk,
    )


@router.get("/conversations")
def get_conversations(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    convs = (
        db.query(ChatConversation)
        .filter(ChatConversation.user_id == current_user.id)
        .order_by(ChatConversation.updated_at.desc())
        .all()
    )
    return [
        {
            "id": conv.id,
            "title": conv.title,
            "project_id": conv.project_id,
            "updated_at": conv.updated_at.isoformat(),
        }
        for conv in convs
    ]


@router.get("/conversations/{conv_id}/messages")
def get_messages(conv_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conv = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conv_id, ChatConversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv_id)
        .order_by(ChatMessage.timestamp)
        .all()
    )
    return [
        {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "was_masked": msg.was_masked,
            "entities": msg.entities,
            "risk_level": msg.risk_level,
            "timestamp": msg.timestamp.isoformat(),
        }
        for msg in msgs
    ]


@router.post("/conversations/{conv_id}/messages")
def save_messages(conv_id: str, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conv = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conv_id, ChatConversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        conv = ChatConversation(id=conv_id, user_id=current_user.id, title=body.get("title", ""))
        db.add(conv)
    else:
        conv.title = body.get("title", conv.title)
        conv.updated_at = datetime.now(KST)

    for message in body.get("messages", []):
        exists = db.query(ChatMessage).filter(ChatMessage.id == message["id"]).first()
        if exists:
            continue
        db.add(
            ChatMessage(
                id=message["id"],
                conversation_id=conv_id,
                role=message["role"],
                content=message["content"],
                was_masked=message.get("was_masked", False),
                entities=message.get("entities", []),
                risk_level=message.get("risk_level", "none"),
            )
        )

    db.commit()
    return {"ok": True}


@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conv = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conv_id, ChatConversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    db.query(ChatMessage).filter(ChatMessage.conversation_id == conv_id).delete()
    db.delete(conv)
    db.commit()
    return {"ok": True}


@router.post("/exception-requests")
def create_exception_request(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    keyword = body.get("keyword", "").strip()
    reason = body.get("reason", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword is required.")
    if not reason:
        raise HTTPException(status_code=400, detail="Reason is required.")

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
