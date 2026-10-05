import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, mask
from app.core.config import settings
from app.core.database import init_db


app = FastAPI(
    title="AI Masking Platform",
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
    return {"status": "ok", "message": "AI Masking Platform API"}
