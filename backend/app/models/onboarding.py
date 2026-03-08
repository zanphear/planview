from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.user import User


class OnboardingTemplate(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "onboarding_templates"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    template_type: Mapped[str] = mapped_column(String(20), nullable=False)  # onboarding, offboarding
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    items: Mapped[list[OnboardingTemplateItem]] = relationship(
        back_populates="template", cascade="all, delete-orphan", lazy="selectin"
    )


class OnboardingTemplateItem(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "onboarding_template_items"

    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("onboarding_templates.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    default_assignee_role: Mapped[str | None] = mapped_column(String(50), nullable=True)  # manager, it, hr, new_starter

    template: Mapped[OnboardingTemplate] = relationship(back_populates="items")


class OnboardingChecklist(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "onboarding_checklists"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("onboarding_templates.id", ondelete="SET NULL"), nullable=True
    )
    checklist_type: Mapped[str] = mapped_column(String(20), nullable=False)  # onboarding, offboarding
    status: Mapped[str] = mapped_column(String(20), default="in_progress", nullable=False)  # in_progress, completed

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    checklist_items: Mapped[list[OnboardingChecklistItem]] = relationship(
        back_populates="checklist", cascade="all, delete-orphan", lazy="selectin"
    )


class OnboardingChecklistItem(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "onboarding_checklist_items"

    checklist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("onboarding_checklists.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    checklist: Mapped[OnboardingChecklist] = relationship(back_populates="checklist_items")
    assignee: Mapped[User | None] = relationship(foreign_keys=[assigned_to])
