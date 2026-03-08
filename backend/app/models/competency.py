from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class Competency(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "competencies"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)  # technical, safety, management, soft_skill
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_certification: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    certification_validity_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    levels: Mapped[list | None] = mapped_column(JSONB, nullable=True)  # e.g. ["awareness", "practitioner", "expert"]

    user_competencies: Mapped[list[UserCompetency]] = relationship(back_populates="competency", cascade="all, delete-orphan")


class UserCompetency(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "user_competencies"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competencies.id", ondelete="CASCADE"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    assessed_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    assessed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    expiry_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    assessor: Mapped[User | None] = relationship(foreign_keys=[assessed_by])
    competency: Mapped[Competency] = relationship(back_populates="user_competencies")
