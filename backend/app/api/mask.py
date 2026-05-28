from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import re
import uuid

from app.schemas.models import ChatRequest, ChatResponse, MaskRequest, MaskResponse
from app.pipeline.regex_layer import detect_and_mask
from app.pipeline.ner_layer import apply_ner_layer
from app.pipeline.risk_layer import apply_risk_layer
from app.llm.openai import get_openai_llm
from app.llm.anthropic import get_anthropic_llm
from app.llm.gemini import get_gemini_llm
from app.core.database import (
    DepartmentChangeRequest,
    ExceptionKeyword,
    ExceptionRequest,
    MaskingLog,
    ChatConversation,
    ChatMessage,
    ChatProject,
    UserPreference,
    PromptTemplate,
    get_db,
)
from app.core.security import get_current_user  # JWT?먯꽌 ?좎? 爰쇰궡???⑥닔
from datetime import datetime, timezone, timedelta
KST = timezone(timedelta(hours=9))

router = APIRouter()

LLM_PROVIDERS = {
    "openai": get_openai_llm,
    "anthropic": get_anthropic_llm,
    "gemini": get_gemini_llm,
}


def get_enabled_exception_keywords(db: Session) -> list[str]:
    rows = db.query(ExceptionKeyword).filter(ExceptionKeyword.enabled == True).all()
    return sorted(
        {row.keyword.strip() for row in rows if row.keyword and row.keyword.strip()},
        key=len,
        reverse=True,
    )


def protect_exception_keywords(text: str, keywords: list[str]) -> tuple[str, list[tuple[str, str]]]:
    protected_text = text
    replacements = []
    for index, keyword in enumerate(keywords):
        token = f"__VEIL_EXCEPTION_{index}__"
        protected_text, count = re.subn(re.escape(keyword), token, protected_text)
        if count:
            replacements.append((token, keyword))
    return protected_text, replacements


def restore_exception_keywords(text: str, replacements: list[tuple[str, str]]) -> str:
    restored = text
    for token, keyword in replacements:
        restored = restored.replace(token, keyword)
    return restored


def run_masking_pipeline_with_exceptions(text: str, db: Session):
    exception_keywords = get_enabled_exception_keywords(db)
    protected_text, replacements = protect_exception_keywords(text, exception_keywords)
    masked_text, entities, overall_risk = run_masking_pipeline(protected_text)
    return restore_exception_keywords(masked_text, replacements), entities, overall_risk

# < 留덉뒪???뚯씠?꾨씪??(?대? 濡쒖쭅) > : ?띿뒪??諛쏆븘??留덉뒪?뱁븯怨??뷀떚??諛섑솚
def run_masking_pipeline(text: str):
    original_text = text
    all_entities = []

    # 1李??뺢퇋?쒗쁽???꾪꽣留?: 留덉뒪?????띿뒪??諛섑솚
    result = detect_and_mask(original_text) # ??dict 諛섑솚
    text_after_regex = result["masked"]  # ??留덉뒪?????띿뒪??
    regex_entities = result["detections"]
    all_entities.extend(regex_entities) # ???뷀떚??紐⑸줉

    # 2李?紐⑤뜽 ?꾪꽣留?
    # 濡쒖뺄 NER 紐⑤뜽/torch ?섍꼍??以鍮꾨릺吏 ?딆븘???뺢퇋??留덉뒪?밴낵 LLM ?먮쫫? ?좎??쒕떎.
    try:
        text_after_ner, ner_entities = apply_ner_layer(text_after_regex)
        all_entities.extend(ner_entities)
    except Exception as e:
        print("NER ERROR:", repr(e))
        text_after_ner = text_after_regex

    # 3李??꾪뿕???먯젙
    text_after_risk, all_entities, overall_risk = apply_risk_layer(
        masked_text=text_after_ner,
        original_text=original_text,
        entities=all_entities,
    )
    
    return text_after_risk, all_entities, overall_risk


# < chat ?붾뱶?ъ씤???뺤쓽 > ??API (?몃????몄텧) : ?꾨줎?몄뿉??HTTP ?붿껌?섎㈃ 諛쏆쓬
@router.post("/chat", response_model=ChatResponse)
async def chat_with_masking(req: ChatRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    session_id = req.session_id or str(uuid.uuid4())
    masked_text, entities, overall_risk = run_masking_pipeline_with_exceptions(req.text, db)
    was_masked = len(entities) > 0

    if was_masked:
        db.add(MaskingLog(
            session_id=session_id,
            entity_types=",".join(set(e.entity_type for e in entities)),
            detection_stage=",".join(set(e.stage for e in entities)),
            risk_level=overall_risk,
            masked_count=len(entities),
            was_masked=True,
            input_length=len(req.text or ""),
        ))
        db.commit()

    provider = (req.provider or "openai").lower()
    if provider not in LLM_PROVIDERS:
        raise HTTPException(status_code=400, detail="吏?먰븯吏 ?딅뒗 LLM provider?낅땲??")

    try:
        llm = LLM_PROVIDERS[provider]()
        preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
        messages = []
        if preference and preference.personal_instructions:
            messages.append({"role": "system", "content": preference.personal_instructions})
        messages.append({"role": "user", "content": masked_text})
        answer = await llm.chat(messages)
    except Exception as e:
        print("LLM ERROR:", repr(e))
        raise HTTPException(status_code=502, detail=f"LLM API ?ㅻ쪟: {str(e)}")
    '''# LLM ?몄텧 ?쒓굅 (?꾩떆)
    answer = "[LLM 鍮꾪솢?깊솕 ?곹깭] 留덉뒪??寃곌낵留?諛섑솚?⑸땲??"'''

    return ChatResponse(
        question=masked_text,
        answer=answer,
        was_masked=was_masked,
        detected_entities=entities,
        overall_risk=overall_risk,
    )

# < preview ?붾뱶?ъ씤???뺤쓽 > ??API (?몃????몄텧) : ?꾨줎?몄뿉??HTTP ?붿껌?섎㈃ 諛쏆쓬
@router.post("/preview", response_model=MaskResponse)
async def preview_masking(req: MaskRequest, db: Session = Depends(get_db)):
    """留덉뒪??寃곌낵 誘몃━蹂닿린 (LLM ?몄텧 ?놁쓬)"""
    masked_text, entities, overall_risk = run_masking_pipeline_with_exceptions(req.text, db)
    return MaskResponse(
        # original_text??蹂댁븞 ?뺤콉 ??媛쒖씤?뺣낫瑜??ы븿 媛?μ꽦???덈뒗 寃껊룄 ?덉쑝???묐떟???ы븿?섏? ?딆쓬 ???꾨뱶 ?쒓굅
        masked_text=masked_text,
        detected_entities=entities,
        was_masked=len(entities) > 0,
        overall_risk=overall_risk,
    )

# < ?꾨줈?앺듃 紐⑸줉 議고쉶 / ???/ ??젣 >
@router.get("/projects")
def get_projects(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    projects = db.query(ChatProject)\
        .filter(ChatProject.user_id == current_user.id)\
        .order_by(ChatProject.updated_at.desc())\
        .all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "color": p.color,
            "description": p.description,
            "instructions": p.instructions,
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
        }
        for p in projects
    ]


@router.post("/projects")
def save_project(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    project_id = body.get("id") or str(uuid.uuid4())
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="?꾨줈?앺듃 ?대쫫???낅젰??二쇱꽭??")

    project = db.query(ChatProject).filter(
        ChatProject.id == project_id,
        ChatProject.user_id == current_user.id,
    ).first()
    if not project:
        project = ChatProject(id=project_id, user_id=current_user.id)
        db.add(project)

    project.name = name
    project.color = body.get("color") or "#667eea"
    project.description = body.get("description") or ""
    project.instructions = body.get("instructions") or ""
    project.updated_at = datetime.now(KST)
    db.commit()
    db.refresh(project)
    return {
        "id": project.id,
        "name": project.name,
        "color": project.color,
        "description": project.description,
        "instructions": project.instructions,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
    }


@router.delete("/projects/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    project = db.query(ChatProject).filter(
        ChatProject.id == project_id,
        ChatProject.user_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="?꾨줈?앺듃瑜?李얠쓣 ???놁뒿?덈떎.")

    db.query(ChatConversation).filter(
        ChatConversation.user_id == current_user.id,
        ChatConversation.project_id == project_id,
    ).update({ChatConversation.project_id: None})
    db.delete(project)
    db.commit()
    return {"ok": True}


# < ???紐⑸줉 議고쉶 >
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

# < ?뱀젙 ???硫붿떆吏 議고쉶 >
@router.get("/conversations/{conv_id}/messages")
def get_messages(conv_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="??붾? 李얠쓣 ???놁뒿?덈떎.")
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

# < ??????(硫붿떆吏 異붽?) >
@router.post("/conversations/{conv_id}/messages")
def save_messages(conv_id: str, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # ????놁쑝硫??덈줈 ?앹꽦
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        conv = ChatConversation(
            id=conv_id,
            user_id=current_user.id,
            title=body.get("title", ""),
            project_id=body.get("project_id"),
        )
        db.add(conv)
    else:
        conv.title = body.get("title", conv.title)
        if "project_id" in body:
            conv.project_id = body.get("project_id")
        conv.updated_at = datetime.now(KST)

    incoming_messages = body.get("messages", [])
    incoming_ids = [m.get("id") for m in incoming_messages if m.get("id")]
    existing_ids = set()
    if incoming_ids:
        existing_ids = {
            row[0]
            for row in db.query(ChatMessage.id)
            .filter(ChatMessage.id.in_(incoming_ids))
            .all()
        }

    seen_ids = set()
    for m in incoming_messages:
        message_id = m.get("id") or str(uuid.uuid4())
        if message_id in existing_ids or message_id in seen_ids:
            continue
        seen_ids.add(message_id)
        db.add(ChatMessage(
            id=message_id,
            conversation_id=conv_id,
            role=m["role"],
            content=m["content"],
            was_masked=m.get("was_masked", False),
            entities=m.get("entities", []),
            risk_level=m.get("risk_level", "none"),
        ))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return {"ok": True}

# < ?????젣 >
@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conv = db.query(ChatConversation).filter(
        ChatConversation.id == conv_id,
        ChatConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="??붾? 李얠쓣 ???놁뒿?덈떎.")
    db.query(ChatMessage).filter(ChatMessage.conversation_id == conv_id).delete()
    db.delete(conv)
    db.commit()
    return {"ok": True}


@router.post("/exception-requests")
def create_exception_request(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    keyword = body.get("keyword", "").strip()
    reason = body.get("reason", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="?덉쇅 泥섎━???ㅼ썙?쒕? ?낅젰??二쇱꽭??")
    if not reason:
        raise HTTPException(status_code=400, detail="?붿껌 ?ъ쑀瑜??낅젰??二쇱꽭??")

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


@router.get("/preferences")
def get_preferences(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    return {
        "personal_instructions": preference.personal_instructions if preference else "",
    }


@router.post("/preferences")
def save_preferences(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    preference = db.query(UserPreference).filter(UserPreference.user_id == current_user.id).first()
    if not preference:
        preference = UserPreference(user_id=current_user.id)
        db.add(preference)
    preference.personal_instructions = (body.get("personal_instructions") or "").strip()
    preference.updated_at = datetime.now(KST)
    db.commit()
    return {"ok": True}


# ── 프롬프트 템플릿 CRUD ──────────────────────────────────────────

@router.get("/templates")
def get_templates(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """로그인한 사용자의 개인 템플릿 목록 반환"""
    templates = (
        db.query(PromptTemplate)
        .filter(PromptTemplate.user_id == current_user.id)
        .order_by(PromptTemplate.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "title": t.title,
            "content": t.content,
            "category": t.category,
            "created_at": t.created_at.isoformat(),
        }
        for t in templates
    ]


@router.post("/templates")
def create_template(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """새 개인 템플릿 생성"""
    title = (body.get("title") or "").strip()
    content = (body.get("content") or "").strip()
    if not title or not content:
        raise HTTPException(status_code=400, detail="제목과 내용을 입력해 주세요.")
    template = PromptTemplate(
        user_id=current_user.id,
        title=title,
        content=content,
        category=(body.get("category") or "기타").strip(),
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return {
        "id": template.id,
        "title": template.title,
        "content": template.content,
        "category": template.category,
        "created_at": template.created_at.isoformat(),
    }


@router.patch("/templates/{template_id}")
def update_template(template_id: int, body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """개인 템플릿 수정 (소유자만 가능)"""
    template = db.query(PromptTemplate).filter(
        PromptTemplate.id == template_id,
        PromptTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    if "title" in body:
        template.title = (body["title"] or "").strip() or template.title
    if "content" in body:
        template.content = (body["content"] or "").strip() or template.content
    if "category" in body:
        template.category = (body["category"] or "기타").strip()
    template.updated_at = datetime.now(KST)
    db.commit()
    db.refresh(template)
    return {
        "id": template.id,
        "title": template.title,
        "content": template.content,
        "category": template.category,
    }


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """개인 템플릿 삭제 (소유자만 가능)"""
    template = db.query(PromptTemplate).filter(
        PromptTemplate.id == template_id,
        PromptTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="템플릿을 찾을 수 없습니다.")
    db.delete(template)
    db.commit()
    return {"ok": True}


# ── 부서 변경 요청 ──────────────────────────────────────────────────

@router.post("/department-change-requests")
def create_department_change_request(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    requested_department = (body.get("requested_department") or "").strip()
    reason = (body.get("reason") or "").strip()
    if not requested_department:
        raise HTTPException(status_code=400, detail="변경할 부서를 입력해 주세요.")
    if requested_department == (current_user.department or ""):
        raise HTTPException(status_code=400, detail="현재 부서와 다른 부서를 입력해 주세요.")

    row = DepartmentChangeRequest(
        user_id=current_user.id,
        requester=current_user.name or current_user.username,
        current_department=current_user.department or "",
        requested_department=requested_department,
        reason=reason,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": row.status}

