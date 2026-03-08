from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class ReviewPeriod(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "review_periods"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str] = mapped_column(Date, nullable=False)

    objectives: Mapped[list[Objective]] = relationship(back_populates="review_period", cascade="all, delete-orphan")


class Objective(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "objectives"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    review_period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("review_periods.id", ondelete="SET NULL"), nullable=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # performance, development, team, business
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)  # draft, active, completed, cancelled
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    review_period: Mapped[ReviewPeriod | None] = relationship(back_populates="objectives")
    key_results: Mapped[list[KeyResult]] = relationship(back_populates="objective", cascade="all, delete-orphan", lazy="selectin")


class KeyResult(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "key_results"

    objective_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("objectives.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    measurement_type: Mapped[str] = mapped_column(String(20), default="numeric", nullable=False)  # numeric, percentage, boolean, milestone

    objective: Mapped[Objective] = relationship(back_populates="key_results")
