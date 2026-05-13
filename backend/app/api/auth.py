from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import User, get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.schemas.models import LoginRequest, RegisterRequest, TokenResponse


router = APIRouter()

DEPARTMENTS = [
    "Management",
    "Development",
    "Marketing",
    "Sales",
    "HR",
    "Finance",
    "Legal",
    "Planning",
    "Design",
    "Operations",
]


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={"username": user.username, "name": user.name, "department": user.department, "role": user.role},
    )


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already exists.")

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
    return TokenResponse(
        access_token=token,
        user={"username": user.username, "name": user.name, "department": user.department, "role": user.role},
    )


@router.get("/departments")
def get_departments():
    return {"departments": DEPARTMENTS}


@router.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "username": current_user.username,
        "name": current_user.name,
        "department": current_user.department,
        "role": current_user.role,
    }
