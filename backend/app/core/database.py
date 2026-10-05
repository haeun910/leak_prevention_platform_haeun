from datetime import datetime, timezone, timedelta

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import hash_password


KST = timezone(timedelta(hours=9))


def now_kst() -> datetime:
    # DB 종류와 상관없이 KST 시각 그대로 저장되도록 timezone 정보를 뗀 값을 사용
    # (PostgreSQL은 timezone 정보가 있으면 UTC로 변환해 저장함)
    return datetime.now(KST).replace(tzinfo=None)

def _database_url(url: str) -> str:
    if not url.strip():
        return "sqlite:///./admin_logs.db"
    # Supabase 등에서 복사한 postgres:// 주소를 SQLAlchemy가 인식하는 형태로 변환
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


DATABASE_URL = _database_url(settings.DATABASE_URL)
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # 외부 DB(Supabase)는 유휴 연결이 끊길 수 있으므로 사용 전 연결 상태를 확인
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
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
    created_at = Column(DateTime, default=now_kst)


class MaskingLog(Base):
    __tablename__ = "masking_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=now_kst)
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
    created_at = Column(DateTime, default=now_kst)
    updated_at = Column(DateTime, default=now_kst)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True)
    conversation_id = Column(String, index=True)
    role = Column(String)
    content = Column(String)
    was_masked = Column(Boolean, default=False)
    entities = Column(JSON, default=list)
    risk_level = Column(String, default="none")
    timestamp = Column(DateTime, default=now_kst)


class ExceptionRequest(Base):
    __tablename__ = "exception_requests"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String, index=True)
    requester = Column(String, default="")
    department = Column(String, default="")
    reason = Column(String, default="")
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=now_kst)
    updated_at = Column(DateTime, default=now_kst)


class ExceptionKeyword(Base):
    __tablename__ = "exception_keywords"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String, unique=True, index=True)
    category = Column(String, default="general")
    description = Column(String, default="")
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_kst)
    updated_at = Column(DateTime, default=now_kst)


def _enable_row_level_security():
    # Supabase는 public 스키마 테이블을 REST API로도 노출하므로 RLS를 켜서 외부 접근을 차단한다.
    # 백엔드는 테이블 소유자(postgres)로 접속하므로 RLS의 영향을 받지 않는다.
    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            conn.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))


def init_db():
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "postgresql":
        _enable_row_level_security()
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                password_hash=hash_password(settings.ADMIN_PASSWORD or "12345678"),
                name="관리자",
                department="운영",
                role="admin",
            )
            db.add(admin)
        else:
            if settings.ADMIN_PASSWORD:
                admin.password_hash = hash_password(settings.ADMIN_PASSWORD)
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
