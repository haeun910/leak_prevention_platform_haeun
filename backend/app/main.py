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


@app.get("/")
async def root():
    return {"status": "ok", "message": "AI Masking Platform API"}
