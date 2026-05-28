from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import ContactInquiry, get_db
from app.schemas.models import ContactInquiryRequest


router = APIRouter()


@router.post("/inquiries", status_code=status.HTTP_201_CREATED)
def create_contact_inquiry(body: ContactInquiryRequest, db: Session = Depends(get_db)):
    if "@" not in body.email or "." not in body.email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="유효한 이메일 주소를 입력해주세요.")

    inquiry = ContactInquiry(
        name=body.name.strip(),
        email=body.email.strip().lower(),
        company=(body.company or "").strip(),
        message=body.message.strip(),
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    return {
        "id": inquiry.id,
        "message": "문의가 접수되었습니다.",
    }
