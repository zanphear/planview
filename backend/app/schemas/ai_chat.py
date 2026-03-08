import uuid
from datetime import datetime

from pydantic import BaseModel


class SessionCreate(BaseModel):
    title: str = "New Chat"


class MessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    tool_calls: dict | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse] = []
    model_config = {"from_attributes": True}


class SessionListItem(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str


class QuickReportRequest(BaseModel):
    report_type: str
    context: dict | None = None


class AIStatusResponse(BaseModel):
    enabled: bool
