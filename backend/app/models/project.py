from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.segment import Segment
    from app.models.tag import Tag
    from app.models.task import Task
    from app.models.workspace import Workspace


class Project(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    colour: Mapped[str] = mapped_column(String(7), server_default=text("'#4186E0'"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), server_default=text("'active'"), nullable=False)
    is_favourite: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    custom_statuses: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )

    workspace: Mapped[Workspace] = relationship(back_populates="projects")
    client: Mapped[Client | None] = relationship(back_populates="projects")
    segments: Mapped[list[Segment]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tags: Mapped[list[Tag]] = relationship(back_populates="project", cascade="all, delete-orphan")
    tasks: Mapped[list[Task]] = relationship(back_populates="project")

    __table_args__ = (
        CheckConstraint("status IN ('active', 'archived')", name="ck_project_status"),
    )
