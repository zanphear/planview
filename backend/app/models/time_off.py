from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.workspace import Workspace


class TimeOff(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "time_off"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    date_from: Mapped[str] = mapped_column(Date, nullable=False)
    date_to: Mapped[str] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), default="Time Off")
    colour: Mapped[str] = mapped_column(String(7), default="#94A3B8")

    user: Mapped[User] = relationship()
    workspace: Mapped[Workspace] = relationship()
