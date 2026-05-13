from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from collections import Counter

from app.core.database import (
    ChatConversation,
    ChatMessage,
    ExceptionKeyword,
    ExceptionRequest,
    MaskingLog,
    User,
    get_db,
)
from app.core.security import decode_token
from app.schemas.models import LogEntry, DashboardStats
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta

router = APIRouter()
bearer = HTTPBearer()
KST = timezone(timedelta(hours=9))


def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "admin":
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한 필요")
    return payload


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    """대시보드 통계 요약"""
    total_requests = db.query(MaskingLog).count()

    total_masked = db.query(func.sum(MaskingLog.masked_count)).scalar() or 0

    masked_requests = (
        db.query(MaskingLog)
        .filter(MaskingLog.masked_count > 0)
        .count()
    )

    high_risk_count = (
        db.query(MaskingLog)
        .filter(func.lower(MaskingLog.risk_level) == "high")
        .count()
    )

    # 엔티티 타입별 집계
    logs = db.query(MaskingLog).all()
    entity_counter = Counter()

    for log in logs:
        if log.entity_types:
            for entity_type in log.entity_types.split(","):
                entity_counter[entity_type.strip()] += 1

    return DashboardStats(
        total_requests=total_requests,
        total_masked=total_masked,
        masked_requests=masked_requests,
        high_risk_count=high_risk_count,
        entity_type_breakdown=dict(entity_counter),
    )


def _entity_count(message: ChatMessage) -> int:
    if not message.entities:
        return 0
    if isinstance(message.entities, list):
        return len(message.entities)
    return 0


@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    logs = db.query(MaskingLog).order_by(MaskingLog.timestamp.desc()).all()
    total_requests = len(logs)
    total_masked = sum(log.masked_count or 0 for log in logs)
    high_risk_count = sum(1 for log in logs if (log.risk_level or "").lower() == "high")
    today = datetime.now(KST).date()
    month = datetime.now(KST).month
    today_masked = sum(log.masked_count or 0 for log in logs if log.timestamp and log.timestamp.date() == today)
    month_masked = sum(log.masked_count or 0 for log in logs if log.timestamp and log.timestamp.month == month)

    by_day = Counter()
    by_month = Counter()
    by_year = Counter()
    entity_counter = Counter()
    for log in logs:
        if log.timestamp:
            by_day[log.timestamp.strftime("%m/%d")] += log.masked_count or 0
            by_month[log.timestamp.strftime("%Y-%m")] += log.masked_count or 0
            by_year[str(log.timestamp.year)] += log.masked_count or 0
        if log.entity_types:
            for entity_type in log.entity_types.split(","):
                if entity_type.strip():
                    entity_counter[entity_type.strip()] += log.masked_count or 1

    recent_logs = logs[:10]
    return {
        "summary": {
            "total_requests": total_requests,
            "total_masked": total_masked,
            "today_masked": today_masked,
            "month_masked": month_masked,
            "high_risk_count": high_risk_count,
            "pending_exception_requests": db.query(ExceptionRequest).filter(ExceptionRequest.status == "pending").count(),
        },
        "masking_stats": {
            "day": [{"label": k, "count": v} for k, v in sorted(by_day.items())[-7:]],
            "month": [{"label": k, "count": v} for k, v in sorted(by_month.items())[-6:]],
            "year": [{"label": k, "count": v} for k, v in sorted(by_year.items())[-5:]],
        },
        "categories": [{"category": k, "count": v} for k, v in entity_counter.most_common(8)],
        "recent_logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "entity_types": log.entity_types or "-",
                "risk_level": log.risk_level or "none",
                "masked_count": log.masked_count or 0,
                "session_id": log.session_id,
            }
            for log in recent_logs
        ],
    }


@router.get("/dashboard/users")
def get_user_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    users = db.query(User).all()
    result = []
    for user in users:
        conv_ids = [c.id for c in db.query(ChatConversation).filter(ChatConversation.user_id == user.id).all()]
        messages = []
        if conv_ids:
            messages = db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conv_ids)).all()
        masked_messages = [m for m in messages if m.was_masked]
        result.append({
            "user_id": user.id,
            "username": user.username,
            "name": user.name,
            "department": user.department,
            "role": user.role,
            "conversation_count": len(conv_ids),
            "message_count": len(messages),
            "masked_message_count": len(masked_messages),
            "masked_count": sum(_entity_count(m) for m in masked_messages),
            "high_risk_count": sum(1 for m in masked_messages if (m.risk_level or "").lower() == "high"),
        })
    return sorted(result, key=lambda item: item["masked_count"], reverse=True)


@router.get("/dashboard/departments")
def get_department_stats(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    user_stats = get_user_stats(db, _)
    departments = {}
    for item in user_stats:
        department = item["department"] or "미지정"
        current = departments.setdefault(department, {
            "department": department,
            "user_count": 0,
            "conversation_count": 0,
            "message_count": 0,
            "masked_message_count": 0,
            "masked_count": 0,
            "high_risk_count": 0,
        })
        current["user_count"] += 1
        for key in ["conversation_count", "message_count", "masked_message_count", "masked_count", "high_risk_count"]:
            current[key] += item[key]
    return sorted(departments.values(), key=lambda item: item["masked_count"], reverse=True)


@router.get("/logs", response_model=List[LogEntry])
def get_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    risk_level: str = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin),
):
    """마스킹 로그 목록 조회"""
    query = db.query(MaskingLog)
    if risk_level:
        query = query.filter(MaskingLog.risk_level == risk_level)
    logs = query.order_by(MaskingLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/users")
def list_users(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for user in users:
        conversations = db.query(ChatConversation).filter(ChatConversation.user_id == user.id).all()
        conversation_ids = [conversation.id for conversation in conversations]
        message_count = 0
        if conversation_ids:
            message_count = db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conversation_ids)).count()
        result.append({
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "department": user.department,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "conversation_count": len(conversations),
            "message_count": message_count,
        })
    return result


@router.patch("/users/{user_id}")
def update_user(user_id: int, body: dict, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.username == current_admin.get("sub") and body.get("role") != "admin":
        raise HTTPException(status_code=400, detail="현재 로그인한 관리자 권한은 변경할 수 없습니다.")
    for key in ["name", "department", "role"]:
        if key in body:
            setattr(user, key, body[key])
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.username == current_admin.get("sub"):
        raise HTTPException(status_code=400, detail="현재 로그인한 관리자 계정은 삭제할 수 없습니다.")

    conversations = db.query(ChatConversation).filter(ChatConversation.user_id == user.id).all()
    conversation_ids = [conversation.id for conversation in conversations]
    if conversation_ids:
        db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conversation_ids)).delete(synchronize_session=False)
    for conversation in conversations:
        db.delete(conversation)
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.get("/exception-requests")
def list_exception_requests(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = db.query(ExceptionRequest).order_by(ExceptionRequest.created_at.desc()).all()
    return [
        {
            "id": row.id,
            "keyword": row.keyword,
            "requester": row.requester,
            "department": row.department,
            "reason": row.reason,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.post("/exception-requests")
def create_exception_request(body: dict, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    row = ExceptionRequest(
        keyword=body.get("keyword", "").strip(),
        requester=body.get("requester", "").strip(),
        department=body.get("department", "").strip(),
        reason=body.get("reason", "").strip(),
        status=body.get("status", "pending"),
    )
    if not row.keyword:
        raise HTTPException(status_code=400, detail="키워드는 필수입니다.")
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.patch("/exception-requests/{request_id}")
def update_exception_request(request_id: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    row = db.query(ExceptionRequest).filter(ExceptionRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="예외 요청을 찾을 수 없습니다.")
    for key in ["keyword", "requester", "department", "reason", "status"]:
        if key in body:
            setattr(row, key, body[key])
    row.updated_at = datetime.now(KST)
    if row.status == "approved" and row.keyword:
        exists = db.query(ExceptionKeyword).filter(ExceptionKeyword.keyword == row.keyword).first()
        if not exists:
            db.add(ExceptionKeyword(
                keyword=row.keyword,
                category=row.department or "request",
                description=row.reason or "승인된 예외 요청",
                enabled=True,
            ))
    db.commit()
    return {"ok": True}


@router.delete("/exception-requests/{request_id}")
def delete_exception_request(request_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    row = db.query(ExceptionRequest).filter(ExceptionRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="예외 요청을 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/exception-keywords")
def list_exception_keywords(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    rows = db.query(ExceptionKeyword).order_by(ExceptionKeyword.created_at.desc()).all()
    return [
        {
            "id": row.id,
            "keyword": row.keyword,
            "category": row.category,
            "description": row.description,
            "enabled": row.enabled,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.post("/exception-keywords")
def create_exception_keyword(body: dict, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    keyword = body.get("keyword", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="키워드는 필수입니다.")
    if db.query(ExceptionKeyword).filter(ExceptionKeyword.keyword == keyword).first():
        raise HTTPException(status_code=400, detail="이미 등록된 키워드입니다.")
    row = ExceptionKeyword(
        keyword=keyword,
        category=body.get("category", "general"),
        description=body.get("description", ""),
        enabled=body.get("enabled", True),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.patch("/exception-keywords/{keyword_id}")
def update_exception_keyword(keyword_id: int, body: dict, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    row = db.query(ExceptionKeyword).filter(ExceptionKeyword.id == keyword_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="예외 키워드를 찾을 수 없습니다.")
    for key in ["keyword", "category", "description", "enabled"]:
        if key in body:
            setattr(row, key, body[key])
    row.updated_at = datetime.now(KST)
    db.commit()
    return {"ok": True}


@router.delete("/exception-keywords/{keyword_id}")
def delete_exception_keyword(keyword_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    row = db.query(ExceptionKeyword).filter(ExceptionKeyword.id == keyword_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="예외 키워드를 찾을 수 없습니다.")
    db.delete(row)
    db.commit()
    return {"ok": True}
