from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class MaskRequest(BaseModel):
    text: str
    session_id: Optional[str] = None


class DetectedEntity(BaseModel):
    masked: str
    entity_type: str
    start: int
    end: int
    stage: str
    risk_level: str
    original: Optional[str] = None


class MaskResponse(BaseModel):
    original_text: Optional[str] = None
    masked_text: str
    detected_entities: List[DetectedEntity]
    was_masked: bool
    overall_risk: str = "none"


class ChatRequest(BaseModel):
    text: str
    session_id: Optional[str] = None
    provider: Optional[str] = "openai"
    conversation_history: List[dict] = Field(default_factory=list)


class ChatResponse(BaseModel):
    question: str
    answer: str
    was_masked: bool
    detected_entities: List[DetectedEntity]
    overall_risk: str


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    department: str


class ContactInquiryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    email: str = Field(..., min_length=5, max_length=120)
    company: Optional[str] = Field(default="", max_length=120)
    message: str = Field(..., min_length=5, max_length=2000)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class LogEntry(BaseModel):
    id: int
    timestamp: Optional[datetime] = None
    session_id: Optional[str] = ""
    entity_types: Optional[str] = "-"
    detection_stage: Optional[str] = ""
    risk_level: Optional[str] = "none"
    masked_count: int = 0
    was_masked: bool = False
    input_length: int = 0
    processing_time_ms: int = 0
    entity_counts: dict = Field(default_factory=dict)

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_requests: int
    total_masked: int
    masked_requests: int
    high_risk_count: int
    entity_type_breakdown: dict
