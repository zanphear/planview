import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserResponse


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_path: str
    file_size: int
    mime_type: str
    task_id: uuid.UUID
    uploaded_by: uuid.UUID
    uploader: UserResponse | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
