from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class CustomField(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "custom_fields"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[str] = mapped_column(
        String(20), server_default=text("'text'"), nullable=False
    )  # text, number, date, select, checkbox
    options: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON for select options
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship()
    values: Mapped[list[CustomFieldValue]] = relationship(
        back_populates="field", cascade="all, delete-orphan"
    )


class CustomFieldValue(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "custom_field_values"

    value: Mapped[str | None] = mapped_column(Text, nullable=True)

    field_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("custom_fields.id", ondelete="CASCADE"), nullable=False
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )

    field: Mapped[CustomField] = relationship(back_populates="values")
