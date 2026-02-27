from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class Webhook(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "webhooks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    events: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # ["task.created", ...]
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship()
    logs: Mapped[list[WebhookLog]] = relationship(
        back_populates="webhook", cascade="all, delete-orphan"
    )


class WebhookLog(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "webhook_logs"

    event: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    response_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)

    webhook_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("webhooks.id", ondelete="CASCADE"), nullable=False
    )

    webhook: Mapped[Webhook] = relationship(back_populates="logs")
