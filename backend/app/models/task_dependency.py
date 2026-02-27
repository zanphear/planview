from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class TaskDependency(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "task_dependencies"

    blocker_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    blocked_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    dependency_type: Mapped[str] = mapped_column(
        String(20), server_default=text("'finish_to_start'"), nullable=False
    )

    blocker = relationship("Task", foreign_keys=[blocker_id])
    blocked = relationship("Task", foreign_keys=[blocked_id])
