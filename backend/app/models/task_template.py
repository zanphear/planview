from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class TaskTemplate(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "task_templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    colour: Mapped[str | None] = mapped_column(String(7), nullable=True)
    status: Mapped[str] = mapped_column(String(50), server_default=text("'todo'"), nullable=False)
    time_estimate_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    checklist_items: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # [{title: str}]
    tag_names: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # [str]

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship()
