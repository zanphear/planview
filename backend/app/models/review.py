from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class ReviewCycle(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "review_cycles"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    period_start: Mapped[str] = mapped_column(Date, nullable=False)
    period_end: Mapped[str] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="setup", nullable=False)
    # setup, self_assessment, manager_review, calibration, complete

    reviews: Mapped[list[Review]] = relationship(back_populates="cycle", cascade="all, delete-orphan")


class Review(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "reviews"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_cycles.id", ondelete="CASCADE"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    self_assessment: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    manager_assessment: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    overall_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    strengths: Mapped[str | None] = mapped_column(Text, nullable=True)
    areas_for_improvement: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="not_started", nullable=False)
    # not_started, self_assessment, manager_draft, discussed, finalised
    sign_off_date: Mapped[str | None] = mapped_column(Date, nullable=True)

    cycle: Mapped[ReviewCycle] = relationship(back_populates="reviews")
    user: Mapped[User] = relationship(foreign_keys=[user_id])
    reviewer: Mapped[User] = relationship(foreign_keys=[reviewer_id])
