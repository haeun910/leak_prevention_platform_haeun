import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import admin, auth, mask
from app.core.config import settings
from app.core.database import engine, init_db


app = FastAPI(
    title="Veil AI",
    description="Enterprise information leak prevention and AI masking API",
    version="1.0.0",
)

SERVER_START_TIME = int(time.time())

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(mask.router, prefix="/api/mask", tags=["mask"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.on_event("startup")
async def startup():
    init_db()
    # NER 모델을 백그라운드에서 미리 로드해 첫 요청 지연을 줄임 (실패해도 정규식 마스킹은 동작)
    threading.Thread(target=_warmup_ner, daemon=True).start()


def _warmup_ner():
    try:
        from app.pipeline.ner_layer import _load_model
        _load_model()
    except Exception as e:
        print("[NER] 사전 로드 실패 (정규식 마스킹만 사용):", repr(e))


@app.get("/")
async def root():
    return {"status": "ok", "message": "Veil AI API"}


# < 상태 확인 > : DB까지 실제로 조회해 서버·DB가 살아 있는지 확인한다.
# 하루 한 번 외부에서 호출해 Supabase 무료 플랜의 비활성 일시정지와 HF Space 잠들기를 막는 용도로 사용.
@app.get("/api/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT count(*) FROM users"))
    except Exception as e:
        print("[HEALTH] DB 확인 실패:", repr(e))
        return JSONResponse(status_code=503, content={"status": "error", "db": "unreachable"})
    return {"status": "ok", "db": "ok"}
