from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.workspace import Workspace


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    initials: Mapped[str | None] = mapped_column(String(2), nullable=True)
    colour: Mapped[str] = mapped_column(String(7), server_default=text("'#4186E0'"), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    role: Mapped[str] = mapped_column(String(20), server_default=text("'regular'"), nullable=False)
    pin_on_top: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship(back_populates="users")

    __table_args__ = (
        CheckConstraint("role IN ('owner', 'admin', 'regular')", name="ck_user_role"),
    )
