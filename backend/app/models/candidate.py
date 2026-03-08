from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class Candidate(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "candidates"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    position_applied: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True)  # referral, agency, direct, internal
    status: Mapped[str] = mapped_column(String(20), default="applied", nullable=False)
    # applied, screening, interviewing, offered, hired, rejected, withdrawn
    applied_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    events: Mapped[list[CandidateEvent]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan", lazy="selectin"
    )


class CandidateEvent(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "candidate_events"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # cv_review, phone_screen, interview, technical_test, offer, rejection
    event_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    interviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    outcome: Mapped[str | None] = mapped_column(String(20), nullable=True)  # pass, fail, maybe
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    candidate: Mapped[Candidate] = relationship(back_populates="events")
    interviewer: Mapped[User | None] = relationship(foreign_keys=[interviewer_id])
