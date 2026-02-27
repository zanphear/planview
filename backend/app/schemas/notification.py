import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserResponse


class NotificationResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    title: str
    body: Optional[str] = None
    is_read: bool
    link: Optional[str] = None
    actor: Optional[UserResponse] = None
    task_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationMarkRead(BaseModel):
    notification_ids: list[uuid.UUID]
