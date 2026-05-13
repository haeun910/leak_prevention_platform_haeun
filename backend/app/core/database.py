from datetime import datetime, timezone, timedelta

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password


KST = timezone(timedelta(hours=9))

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    name = Column(String)
    department = Column(String)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=lambda: datetime.now(KST))


class MaskingLog(Base):
    __tablename__ = "masking_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(KST))
    session_id = Column(String, index=True)
    entity_types = Column(String)
    detection_stage = Column(String)
    risk_level = Column(String)
    masked_count = Column(Integer, default=0)
    was_masked = Column(Boolean, default=False)
    input_length = Column(Integer, default=0)
    entity_counts = Column(JSON, default=dict)
    processing_time_ms = Column(Integer, default=0)


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(String, primary_key=True)
    user_id = Column(Integer, index=True)
    title = Column(String, default="")
    project_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    updated_at = Column(DateTime, default=lambda: datetime.now(KST))


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True)
    conversation_id = Column(String, index=True)
    role = Column(String)
    content = Column(String)
    was_masked = Column(Boolean, default=False)
    entities = Column(JSON, default=list)
    risk_level = Column(String, default="none")
    timestamp = Column(DateTime, default=lambda: datetime.now(KST))


class ExceptionRequest(Base):
    __tablename__ = "exception_requests"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String, index=True)
    requester = Column(String, default="")
    department = Column(String, default="")
    reason = Column(String, default="")
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    updated_at = Column(DateTime, default=lambda: datetime.now(KST))


class ExceptionKeyword(Base):
    __tablename__ = "exception_keywords"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String, unique=True, index=True)
    category = Column(String, default="general")
    description = Column(String, default="")
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    updated_at = Column(DateTime, default=lambda: datetime.now(KST))


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                password_hash=hash_password("12345678"),
                name="관리자",
                department="운영",
                role="admin",
            )
            db.add(admin)
        else:
            admin.password_hash = hash_password("12345678")
            admin.name = "관리자"
            admin.department = "운영"
            admin.role = "admin"
        db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
