from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class PulseSurvey(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "pulse_surveys"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, closed
    end_date: Mapped[str | None] = mapped_column(Date, nullable=True)

    responses: Mapped[list[PulseResponse]] = relationship(back_populates="survey", cascade="all, delete-orphan")


class PulseResponse(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "pulse_responses"

    survey_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pulse_surveys.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    morale: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    workload: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    support: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)

    survey: Mapped[PulseSurvey] = relationship(back_populates="responses")


class Kudos(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "kudos"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    to_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    message: Mapped[str] = mapped_column(String(500), nullable=False)

    from_user: Mapped[User] = relationship(foreign_keys=[from_user_id])
    to_user: Mapped[User] = relationship(foreign_keys=[to_user_id])
