from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey

if TYPE_CHECKING:
    from app.models.milestone import Milestone
    from app.models.project import Project
    from app.models.task import Task
    from app.models.team import Team
    from app.models.user import User


class Workspace(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    users: Mapped[list[User]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    teams: Mapped[list[Team]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    projects: Mapped[list[Project]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    tasks: Mapped[list[Task]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    milestones: Mapped[list[Milestone]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
