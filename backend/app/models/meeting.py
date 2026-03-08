from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class Meeting(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "meetings"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    manager_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    scheduled_date: Mapped[str] = mapped_column(Date, nullable=False)
    actual_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mood: Mapped[str | None] = mapped_column(String(20), nullable=True)  # good, neutral, concern
    status: Mapped[str] = mapped_column(String(20), default="scheduled", nullable=False)  # scheduled, completed, cancelled

    manager: Mapped[User] = relationship(foreign_keys=[manager_id])
    report: Mapped[User] = relationship(foreign_keys=[report_id])
    actions: Mapped[list[MeetingAction]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", lazy="selectin"
    )


class MeetingAction(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "meeting_actions"

    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)  # open, done
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    carried_from_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("meeting_actions.id", ondelete="SET NULL"), nullable=True
    )

    meeting: Mapped[Meeting] = relationship(back_populates="actions")
    owner: Mapped[User | None] = relationship(foreign_keys=[owner_id])
