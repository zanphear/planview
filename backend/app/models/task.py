from __future__ import annotations

import uuid
from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.checklist import Checklist
    from app.models.comment import Comment
    from app.models.attachment import Attachment
    from app.models.project import Project
    from app.models.segment import Segment
    from app.models.tag import Tag
    from app.models.user import User
    from app.models.workspace import Workspace

task_assignees = Table(
    "task_assignees",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
)

task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", UUID(as_uuid=True), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Task(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "tasks"

    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    colour: Mapped[str | None] = mapped_column(String(7), nullable=True)
    status: Mapped[str] = mapped_column(String(50), server_default=text("'todo'"), nullable=False)
    status_emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)
    date_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    time_estimate_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_estimate_mode: Mapped[str] = mapped_column(String(10), server_default=text("'total'"), nullable=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    recurrence_rule: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)

    project_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    segment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("segments.id", ondelete="SET NULL"), nullable=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship(back_populates="tasks")
    project: Mapped[Project | None] = relationship(back_populates="tasks")
    segment: Mapped[Segment | None] = relationship()
    assignees: Mapped[list[User]] = relationship(secondary=task_assignees, lazy="selectin")
    tags: Mapped[list[Tag]] = relationship(secondary=task_tags, lazy="selectin")
    checklists: Mapped[list[Checklist]] = relationship(back_populates="task", cascade="all, delete-orphan")
    comments: Mapped[list[Comment]] = relationship(back_populates="task", cascade="all, delete-orphan")
    attachments: Mapped[list[Attachment]] = relationship(back_populates="task", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "time_estimate_mode IN ('total', 'per_day')", name="ck_task_time_estimate_mode"
        ),
        Index("ix_task_workspace_dates", "workspace_id", "date_from", "date_to"),
        Index("ix_task_project_status", "project_id", "status"),
    )
