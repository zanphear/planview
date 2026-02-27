from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.task import Task


class Checklist(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "checklists"

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )

    task: Mapped[Task] = relationship(back_populates="checklists")
