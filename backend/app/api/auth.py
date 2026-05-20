from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import User, get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.schemas.models import LoginRequest, RegisterRequest, TokenResponse


router = APIRouter()

DEPARTMENTS = [
    "경영지원",
    "개발",
    "마케팅",
    "영업",
    "인사",
    "재무",
    "법무",
    "기획",
    "디자인",
    "운영",
]


def _user_payload(user: User) -> dict:
    return {
        "username": user.username,
        "email": user.username,
        "name": user.name,
        "department": user.department,
        "role": user.role,
    }


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
        )

    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, user=_user_payload(user))


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")
    if req.department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail="유효하지 않은 부서입니다.")

    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        name=req.name,
        department=req.department,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, user=_user_payload(user))


@router.get("/departments")
def get_departments():
    return {"departments": DEPARTMENTS}


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return _user_payload(current_user)
