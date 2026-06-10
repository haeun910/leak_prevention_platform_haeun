import re

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
    "IT보안",
]


def _user_payload(user: User) -> dict:
    return {
        "username": user.username,
        "email": user.username,
        "name": user.name,
        "department": user.department,
        "role": user.role,
        "must_change_password": bool(user.must_change_password),
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
        role="pending",
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


@router.patch("/change-password")
def change_password(body: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    current_pw = body.get("current_password", "")
    new_pw = body.get("new_password", "")
    if not current_pw or not new_pw:
        raise HTTPException(status_code=400, detail="현재 비밀번호와 새 비밀번호를 입력해 주세요.")
    if not verify_password(current_pw, current_user.password_hash):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    if len(new_pw) < 8:
        raise HTTPException(status_code=400, detail="새 비밀번호는 8자 이상이어야 합니다.")
    if not re.search(r'[A-Z]', new_pw):
        raise HTTPException(status_code=400, detail="새 비밀번호는 대문자를 포함해야 합니다.")
    if not re.search(r'[a-z]', new_pw):
        raise HTTPException(status_code=400, detail="새 비밀번호는 소문자를 포함해야 합니다.")
    if not re.search(r'\d', new_pw):
        raise HTTPException(status_code=400, detail="새 비밀번호는 숫자를 포함해야 합니다.")
    if not re.search(r'[@$!%*?&]', new_pw):
        raise HTTPException(status_code=400, detail="새 비밀번호는 특수문자(@$!%*?&)를 포함해야 합니다.")
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    user.password_hash = hash_password(new_pw)
    user.must_change_password = False
    db.commit()
    return {"ok": True}
